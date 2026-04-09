import { Injectable, NotFoundException } from '@nestjs/common';
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
      throw new NotFoundException('Partner profile not found.');
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
      throw new NotFoundException('Partner profile not found.');
    }

    const request = await this.ensureDraftRequest(partnerProfile.id);

    return this.prisma.$transaction(async (tx) => {
      await tx.partnerProfile.update({
        where: { id: partnerProfile.id },
        data: {
          verificationStatus: 'pending_verification',
        },
      });

      return tx.verificationRequest.update({
        where: { id: request.id },
        data: {
          status: 'submitted',
          submittedAt: new Date(),
        },
        include: {
          documents: {
            include: {
              file: true,
            },
          },
        },
      });
    });
  }

  async getMyRequest(userId: string) {
    const partnerProfile = await this.prisma.partnerProfile.findUnique({
      where: { ownerUserId: userId },
    });

    if (!partnerProfile) {
      throw new NotFoundException('Partner profile not found.');
    }

    return this.prisma.verificationRequest.findFirst({
      where: {
        partnerProfileId: partnerProfile.id,
      },
      include: {
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

    return this.prisma.verificationRequest.create({
      data: {
        partnerProfileId,
        status: 'draft',
      },
    });
  }
}
