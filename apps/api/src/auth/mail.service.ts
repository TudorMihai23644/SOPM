import { Injectable, Logger } from '@nestjs/common';

/**
 * Trimiterea emailurilor. În versiunea 1 nu avem un serviciu de email gratuit configurat
 * (decizia 6 din specificații), așa că linkul de resetare se scrie în logul serverului.
 * Un furnizor real (Resend, Brevo etc.) se conectează aici, fără alte modificări.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger('mail');

  async sendPasswordReset(email: string, link: string): Promise<void> {
    this.logger.log(`Resetare parolă pentru ${email}: ${link}`);
  }
}
