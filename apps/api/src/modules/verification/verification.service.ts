import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  PartnerVerificationStatus,
  Prisma,
  VerificationRequest,
  VerificationRequestStatus,
} from '@prisma/client';
import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AddVerificationDocumentDto } from './dto/add-verification-document.dto';

const ACTIVE_REVIEW_STATUSES: VerificationRequestStatus[] = ['submitted', 'in_review'];

@Injectable()
export class VerificationService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async addDocument(userId: string, dto: AddVerificationDocumentDto) {
    const partnerProfile = await this.getPartnerProfileOrThrow(userId);
    const request = await this.getRequestForDocumentUpload(
      partnerProfile.id,
      partnerProfile.verificationStatus,
    );

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
    const partnerProfile = await this.getPartnerProfileOrThrow(userId);
    const request = await this.getRequestForSubmission(
      partnerProfile.id,
      partnerProfile.verificationStatus,
    );

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
    const partnerProfile = await this.getPartnerProfileOrThrow(userId);
    const requests = await this.prisma.verificationRequest.findMany({
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
    });

    return this.selectRelevantRequest(requests, partnerProfile.verificationStatus);
  }

  private async getPartnerProfileOrThrow(userId: string) {
    const partnerProfile = await this.prisma.partnerProfile.findUnique({
      where: { ownerUserId: userId },
    });

    if (!partnerProfile) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.partnerProfileNotFound,
        message: 'Профиль партнера не найден.',
      });
    }

    return partnerProfile;
  }

  private async getRequestForDocumentUpload(
    partnerProfileId: string,
    partnerVerificationStatus: PartnerVerificationStatus,
  ) {
    const requests = await this.listRequests(partnerProfileId);
    const activeRequest =
      this.selectLatestRequestByStatuses(requests, ACTIVE_REVIEW_STATUSES) ??
      this.selectLatestRequestByStatuses(requests, ['needs_correction', 'draft']);

    if (activeRequest) {
      return activeRequest;
    }

    if (partnerVerificationStatus === 'verified') {
      throw new AppError(HttpStatus.CONFLICT, {
        code: ERROR_CODES.verificationRequestInvalidTransition,
        message: 'Верифицированный профиль партнера не требует новой заявки.',
      });
    }

    return this.createDraftRequest(
      partnerProfileId,
      partnerVerificationStatus === 'rejected' ? 'draft' : undefined,
    );
  }

  private async getRequestForSubmission(
    partnerProfileId: string,
    partnerVerificationStatus: PartnerVerificationStatus,
  ) {
    const requests = await this.listRequests(partnerProfileId);
    const activeReviewRequest = this.selectLatestRequestByStatuses(requests, ACTIVE_REVIEW_STATUSES);

    if (activeReviewRequest) {
      throw new AppError(HttpStatus.CONFLICT, {
        code: ERROR_CODES.verificationRequestAlreadyPending,
        message: 'Заявка на верификацию уже находится на рассмотрении.',
      });
    }

    if (
      partnerVerificationStatus === 'verified' ||
      this.selectLatestRequestByStatuses(requests, ['approved'])
    ) {
      throw new AppError(HttpStatus.CONFLICT, {
        code: ERROR_CODES.verificationRequestInvalidTransition,
        message: 'Верифицированный профиль партнера нельзя отправить повторно.',
      });
    }

    return (
      this.selectLatestRequestByStatuses(requests, ['draft', 'needs_correction']) ??
      this.createDraftRequest(
        partnerProfileId,
        partnerVerificationStatus === 'rejected' ? 'draft' : undefined,
      )
    );
  }

  private async listRequests(partnerProfileId: string) {
    return this.prisma.verificationRequest.findMany({
      where: {
        partnerProfileId,
      },
    });
  }

  private async createDraftRequest(
    partnerProfileId: string,
    nextPartnerStatus?: PartnerVerificationStatus,
  ) {
    return this.prisma.$transaction(async (tx) => {
      if (nextPartnerStatus) {
        await tx.partnerProfile.update({
          where: { id: partnerProfileId },
          data: {
            verificationStatus: nextPartnerStatus,
          },
        });
      }

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

  private selectRelevantRequest<T extends VerificationRequest>(
    requests: T[],
    partnerVerificationStatus: PartnerVerificationStatus,
  ) {
    const buckets = this.getRelevantStatusBuckets(partnerVerificationStatus);

    for (const statuses of buckets) {
      const candidate = this.selectLatestRequestByStatuses(requests, statuses);

      if (candidate) {
        return candidate;
      }
    }

    return null;
  }

  private getRelevantStatusBuckets(partnerVerificationStatus: PartnerVerificationStatus) {
    switch (partnerVerificationStatus) {
      case 'verified':
        return [
          ['approved'],
          ACTIVE_REVIEW_STATUSES,
          ['needs_correction'],
          ['draft'],
          ['rejected'],
        ] as VerificationRequestStatus[][];
      case 'pending_verification':
        return [
          ACTIVE_REVIEW_STATUSES,
          ['needs_correction'],
          ['draft'],
          ['approved'],
          ['rejected'],
        ] as VerificationRequestStatus[][];
      case 'rejected':
        return [
          ['rejected'],
          ['draft'],
          ['needs_correction'],
          ACTIVE_REVIEW_STATUSES,
          ['approved'],
        ] as VerificationRequestStatus[][];
      default:
        return [
          ['needs_correction'],
          ['draft'],
          ACTIVE_REVIEW_STATUSES,
          ['approved'],
          ['rejected'],
        ] as VerificationRequestStatus[][];
    }
  }

  private selectLatestRequestByStatuses<T extends VerificationRequest>(
    requests: T[],
    statuses: VerificationRequestStatus[],
  ) {
    const matchingRequests = requests.filter((request) => statuses.includes(request.status));

    if (!matchingRequests.length) {
      return null;
    }

    return matchingRequests.sort(
      (left, right) =>
        this.getRequestRelevantTimestamp(right).getTime() -
        this.getRequestRelevantTimestamp(left).getTime(),
    )[0];
  }

  private getRequestRelevantTimestamp(request: VerificationRequest) {
    return request.reviewedAt ?? request.submittedAt ?? request.createdAt;
  }
}
