import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AddVerificationDocumentDto } from './dto/add-verification-document.dto';

@Injectable()
export class VerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async addDocument(userId: string, dto: AddVerificationDocumentDto) {
    const partnerProfile = await this.prisma.partnerProfile.findUnique({
      where: { ownerUserId: userId },
    });

    if (!partnerProfile) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.partnerProfileNotFound,
        message: 'Partner profile not found.',
      });
    }

    const request = await this.ensureDraftRequest(partnerProfile.id);

    return this.prisma.$transaction(async (tx) => {
      const file = await tx.file.create({
        data: {
          originalName: dto.originalName,
          storageBucket: 'pending',
          storageKey: dto.storageKey,
          mimeType: dto.mimeType,
          sizeBytes: dto.sizeBytes,
          uploadedByUserId: userId,
        },
      });

      return tx.verificationDocument.create({
        data: {
          verificationRequestId: request.id,
          fileId: file.id,
          documentType: dto.documentType,
        },
        include: {
          file: true,
        },
      });
    });
  }

  async submit(userId: string) {
    const partnerProfile = await this.prisma.partnerProfile.findUnique({
      where: { ownerUserId: userId },
    });

    if (!partnerProfile) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.partnerProfileNotFound,
        message: 'Partner profile not found.',
      });
    }

    if (partnerProfile.verificationStatus === 'pending_verification') {
      throw new AppError(HttpStatus.CONFLICT, {
        code: ERROR_CODES.verificationRequestAlreadyPending,
        message: 'Verification request is already pending review.',
      });
    }

    if (partnerProfile.verificationStatus === 'verified') {
      throw new AppError(HttpStatus.CONFLICT, {
        code: ERROR_CODES.verificationRequestInvalidTransition,
        message: 'Verified partner profile cannot be resubmitted.',
      });
    }

    const activeRequest = await this.prisma.verificationRequest.findFirst({
      where: {
        partnerProfileId: partnerProfile.id,
        status: {
          in: ['submitted', 'in_review'],
        },
      },
    });

    if (activeRequest) {
      throw new AppError(HttpStatus.CONFLICT, {
        code: ERROR_CODES.verificationRequestAlreadyPending,
        message: 'Verification request is already pending review.',
      });
    }

    const request = await this.ensureDraftRequest(partnerProfile.id);

    return this.prisma.$transaction(async (tx) => {
      await tx.partnerProfile.update({
        where: { id: partnerProfile.id },
        data: {
          verificationStatus: 'pending_verification',
        },
      });

      const updatedRequest = await tx.verificationRequest.update({
        where: { id: request.id },
        data: {
          status: 'submitted',
          submittedAt: new Date(),
          reviewedAt: null,
          comment: null,
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

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'verification_request.submitted',
          targetEntity: 'verification_request',
          targetId: request.id,
          metadata: {
            partnerProfileId: partnerProfile.id,
            previousStatus: request.status,
            nextStatus: 'submitted',
          } as Prisma.InputJsonValue,
        },
      });

      return updatedRequest;
    });
  }

  async getMyRequest(userId: string) {
    const partnerProfile = await this.prisma.partnerProfile.findUnique({
      where: { ownerUserId: userId },
    });

    if (!partnerProfile) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.partnerProfileNotFound,
        message: 'Partner profile not found.',
      });
    }

    return this.prisma.verificationRequest.findFirst({
      where: {
        partnerProfileId: partnerProfile.id,
      },
      include: {
        partnerProfile: true,
        documents: {
          include: {
            file: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private async ensureDraftRequest(partnerProfileId: string) {
    const existing = await this.prisma.verificationRequest.findFirst({
      where: {
        partnerProfileId,
        status: {
          in: ['draft', 'needs_correction'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.verificationRequest.create({
        data: {
          partnerProfileId,
          status: 'draft',
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'verification_request.draft_created',
          targetEntity: 'verification_request',
          targetId: request.id,
          metadata: {
            partnerProfileId,
            status: 'draft',
          } as Prisma.InputJsonValue,
        },
      });

      return request;
    });
  }
}
