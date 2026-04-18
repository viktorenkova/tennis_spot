import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  PartnerVerificationStatus,
  Prisma,
  VerificationRequestStatus,
} from '@prisma/client';
import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ListVerificationRequestsDto } from './dto/list-verification-requests.dto';

const REVIEWABLE_STATUSES: VerificationRequestStatus[] = ['submitted', 'in_review'];

@Injectable()
export class AdminVerificationService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  getVerificationRequests(query: ListVerificationRequestsDto) {
    return this.prisma.verificationRequest.findMany({
      where: query.status
        ? {
            status: query.status,
          }
        : undefined,
      include: {
        partnerProfile: {
          include: {
            city: true,
            district: true,
            ownerUser: {
              select: {
                id: true,
                phone: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          submittedAt: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  }

  async getVerificationRequestById(requestId: string) {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id: requestId },
      include: {
        partnerProfile: {
          include: {
            city: true,
            district: true,
            ownerUser: {
              select: {
                id: true,
                phone: true,
                status: true,
              },
            },
            profileTypes: {
              include: {
                partnerType: true,
              },
            },
            contacts: true,
          },
        },
        documents: {
          include: {
            file: true,
          },
        },
      },
    });

    if (!request) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.verificationRequestNotFound,
        message: 'Заявка на верификацию не найдена.',
      });
    }

    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        targetEntity: 'verification_request',
        targetId: requestId,
      },
      include: {
        actorUser: {
          select: {
            id: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      ...request,
      auditLogs,
    };
  }

  approve(requestId: string, actorUserId: string, comment?: string) {
    return this.reviewRequest({
      requestId,
      actorUserId,
      nextRequestStatus: 'approved',
      nextPartnerStatus: 'verified',
      auditAction: 'verification_request.approved',
      comment,
    });
  }

  reject(requestId: string, actorUserId: string, comment: string) {
    return this.reviewRequest({
      requestId,
      actorUserId,
      nextRequestStatus: 'rejected',
      nextPartnerStatus: 'rejected',
      auditAction: 'verification_request.rejected',
      comment,
    });
  }

  needsCorrection(requestId: string, actorUserId: string, comment: string) {
    return this.reviewRequest({
      requestId,
      actorUserId,
      nextRequestStatus: 'needs_correction',
      nextPartnerStatus: 'draft',
      auditAction: 'verification_request.needs_correction',
      comment,
    });
  }

  private async reviewRequest(params: {
    requestId: string;
    actorUserId: string;
    nextRequestStatus: VerificationRequestStatus;
    nextPartnerStatus: PartnerVerificationStatus;
    auditAction: string;
    comment?: string;
  }) {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id: params.requestId },
      include: {
        partnerProfile: true,
      },
    });

    if (!request) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.verificationRequestNotFound,
        message: 'Заявка на верификацию не найдена.',
      });
    }

    if (
      request.status === 'approved' ||
      request.status === 'rejected' ||
      request.status === 'needs_correction'
    ) {
      throw new AppError(HttpStatus.CONFLICT, {
        code: ERROR_CODES.verificationRequestAlreadyFinalized,
        message: `Заявка уже финализирована в статусе ${request.status}.`,
      });
    }

    if (!REVIEWABLE_STATUSES.includes(request.status)) {
      throw new AppError(HttpStatus.CONFLICT, {
        code: ERROR_CODES.verificationRequestInvalidTransition,
        message: `Заявку в статусе ${request.status} нельзя передать на модерацию.`,
      });
    }

    if (request.partnerProfile.ownerUserId === params.actorUserId) {
      throw new AppError(HttpStatus.FORBIDDEN, {
        code: ERROR_CODES.forbidden,
        message: 'Администратор не может модерировать собственную заявку на верификацию.',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.verificationRequest.update({
        where: {
          id: request.id,
        },
        data: {
          status: params.nextRequestStatus,
          reviewedAt: new Date(),
          comment: params.comment,
        },
        include: {
          partnerProfile: true,
          documents: {
            include: {
              file: true,
            },
          },
        },
      });

      await tx.partnerProfile.update({
        where: { id: request.partnerProfileId },
        data: {
          verificationStatus: params.nextPartnerStatus,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: params.actorUserId,
          action: params.auditAction,
          targetEntity: 'verification_request',
          targetId: request.id,
          comment: params.comment,
          metadata: {
            previousStatus: request.status,
            nextStatus: params.nextRequestStatus,
            partnerProfileId: request.partnerProfileId,
          } as Prisma.InputJsonValue,
        },
      });

      return updatedRequest;
    });
  }
}
