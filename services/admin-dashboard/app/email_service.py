# services/admin-dashboard/app/email_service.py
"""
Professional Email Service for Admin Authentication - FIXED VERSION
Clean backend service for 6-digit verification codes with proper Gmail SMTP
"""

import smtplib
import ssl
import random
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import logging
import os

logger = logging.getLogger(__name__)

class EmailService:
    """Clean email service for healthcare admin authentication"""
    
    def __init__(self):
        # Email configuration - FOR DEVELOPMENT/TESTING
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        
        # IMPORTANT: For testing, you need to set these environment variables
        # or update them with your actual Gmail credentials
        self.smtp_username = os.getenv("SMTP_USERNAME", "")  # Your Gmail address
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")  # Your Gmail app password
        
        # Company configuration
        self.company_name = "Gesan Healthcare Systems"
        self.system_name = "Sistema Gestione Diabetes Cronico"
        self.support_email = "support@gesan.it"
        
        # Development mode flag
        self.development_mode = os.getenv("ENV", "development") == "development"
        
        # Email validation
        self._validate_config()
        
    def _validate_config(self):
        """Validate email configuration"""
        if self.development_mode:
            if not self.smtp_username or not self.smtp_password:
                logger.warning("⚠️ SMTP credentials not configured - using DEVELOPMENT MODE")
                logger.warning("   Emails will be logged but not sent")
                logger.warning("   Set SMTP_USERNAME and SMTP_PASSWORD environment variables for real emails")
        else:
            if not self.smtp_username or not self.smtp_password:
                logger.error("❌ SMTP credentials required for production mode")
                raise ValueError("SMTP credentials not configured for production")
    
    def generate_verification_code(self) -> str:
        """Generate secure 6-digit verification code"""
        return f"{random.randint(100000, 999999)}"
    
    def _create_email_template(self, nome: str, cognome: str, code: str, purpose: str = "signup") -> tuple:
        """Create clean email template without excessive styling"""
        
        if purpose == "signup":
            subject = "🔐 Verifica Account - Gesan Healthcare"
            header = "Registrazione Sistema Amministrativo"
            message = f"Gentile {nome} {cognome}, completa la registrazione inserendo questo codice:"
            action = "per completare la registrazione e attivare il tuo account."
        else:
            subject = "🔑 Codice Accesso - Gesan Healthcare"
            header = "Accesso Sistema Amministrativo"
            message = f"Gentile {nome} {cognome}, inserisci questo codice per accedere:"
            action = "per completare l'accesso al sistema."
        
        # Plain text version
        text_body = f"""
{header}
{self.system_name}

{message}

CODICE VERIFICA: {code}

Inserisci questo codice {action}

Il codice scadrà tra 15 minuti.

---
{self.company_name}
Supporto: {self.support_email}
        """.strip()
        
        # HTML version
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>{subject}</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px;">
                <h1 style="color: #3b82f6;">🏥 {self.company_name}</h1>
                <h2 style="color: #6b7280; margin: 0;">{header}</h2>
            </div>
            
            <div style="background: #f8fafc; padding: 30px; border-radius: 8px; text-align: center;">
                <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                    {message}
                </p>
                
                <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
                    <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">CODICE VERIFICA</p>
                    <p style="font-size: 32px; font-weight: bold; color: #1f2937; margin: 0; letter-spacing: 4px;">
                        {code}
                    </p>
                </div>
                
                <p style="font-size: 14px; color: #6b7280;">
                    Inserisci questo codice {action}
                </p>
                
                <p style="font-size: 12px; color: #ef4444; margin-top: 20px;">
                    ⏰ Il codice scadrà tra 15 minuti
                </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 12px; color: #9ca3af;">
                    {self.system_name}<br>
                    Supporto: {self.support_email}
                </p>
            </div>
        </body>
        </html>
        """
        
        return subject, text_body, html_body
    
    async def send_verification_email(self, email: str, nome: str, cognome: str, code: str, purpose: str = "signup") -> bool:
        """Send verification email with 6-digit code"""
        try:
            # Create email content
            subject, text_body, html_body = self._create_email_template(nome, cognome, code, purpose)
            
            # Log the email attempt
            logger.info(f"📧 Sending {purpose} email to: {email}")
            logger.info(f"📧 Subject: {subject}")
            logger.info(f"📧 Code: {code}")
            
            # DEVELOPMENT MODE: Just log the email
            if self.development_mode and (not self.smtp_username or not self.smtp_password):
                logger.info("=" * 80)
                logger.info("📧 DEVELOPMENT MODE - EMAIL CONTENT:")
                logger.info(f"TO: {email}")
                logger.info(f"SUBJECT: {subject}")
                logger.info("-" * 40)
                logger.info(text_body)
                logger.info("=" * 80)
                logger.info("✅ Email logged (not sent) - configure SMTP for real emails")
                return True
            
            # PRODUCTION MODE: Actually send the email
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.smtp_username
            msg["To"] = email
            
            # Add both plain text and HTML versions
            text_part = MIMEText(text_body, "plain", "utf-8")
            html_part = MIMEText(html_body, "html", "utf-8")
            
            msg.attach(text_part)
            msg.attach(html_part)
            
            # Connect to SMTP server and send
            context = ssl.create_default_context()
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"✅ {purpose} email sent successfully to: {email}")
            return True
            
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"❌ SMTP Authentication failed: {str(e)}")
            logger.error("💡 Check your Gmail app password and username")
            return False
        except smtplib.SMTPException as e:
            logger.error(f"❌ SMTP error sending email to {email}: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"❌ Email sending failed to {email}: {str(e)}")
            return False
    
    async def send_welcome_email(self, email: str, nome: str, cognome: str) -> bool:
        """Send welcome email after successful verification"""
        try:
            subject = "🎉 Benvenuto - Gesan Healthcare Systems"
            
            text_body = f"""
Benvenuto nel Sistema Amministrativo!

Gentile {nome} {cognome},

Il tuo account è stato attivato con successo!

Ora puoi accedere al sistema usando la tua email: {email}

Funzionalità disponibili:
• Dashboard amministrativo
• Gestione pazienti  
• Monitoraggio sistema
• Report e analytics

Buon lavoro!

---
{self.company_name}
Supporto: {self.support_email}
            """.strip()
            
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>{subject}</title>
            </head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px;">
                    <h1 style="color: #10b981;">🏥 {self.company_name}</h1>
                    <h2 style="color: #6b7280; margin: 0;">Benvenuto nel Sistema!</h2>
                </div>
                
                <div style="background: #f0fdf4; padding: 30px; border-radius: 8px;">
                    <p style="font-size: 18px; color: #374151; margin-bottom: 20px;">
                        Gentile <strong>{nome} {cognome}</strong>,
                    </p>
                    
                    <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                        Il tuo account è stato <strong>attivato con successo</strong>!
                    </p>
                    
                    <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
                        <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">IL TUO ACCOUNT</p>
                        <p style="font-size: 16px; color: #1f2937; margin: 0;">
                            📧 {email}
                        </p>
                    </div>
                    
                    <div style="margin-top: 20px;">
                        <p style="font-size: 14px; color: #374151; margin-bottom: 10px;"><strong>Funzionalità disponibili:</strong></p>
                        <ul style="color: #6b7280; padding-left: 20px;">
                            <li>Dashboard amministrativo</li>
                            <li>Gestione pazienti</li>
                            <li>Monitoraggio sistema</li>
                            <li>Report e analytics</li>
                        </ul>
                    </div>
                    
                    <p style="font-size: 16px; color: #10b981; font-weight: bold; text-align: center; margin-top: 30px;">
                        Buon lavoro! 🚀
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <p style="font-size: 12px; color: #9ca3af;">
                        {self.system_name}<br>
                        Supporto: {self.support_email}
                    </p>
                </div>
            </body>
            </html>
            """
            
            # Log the welcome email
            logger.info(f"🎉 Sending welcome email to: {email}")
            
            if self.development_mode and (not self.smtp_username or not self.smtp_password):
                logger.info("=" * 80)
                logger.info("🎉 DEVELOPMENT MODE - WELCOME EMAIL:")
                logger.info(f"TO: {email}")
                logger.info(f"SUBJECT: {subject}")
                logger.info("-" * 40)
                logger.info(text_body)
                logger.info("=" * 80)
                return True
            
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.smtp_username
            msg["To"] = email
            
            text_part = MIMEText(text_body, "plain", "utf-8")
            html_part = MIMEText(html_body, "html", "utf-8")
            
            msg.attach(text_part)
            msg.attach(html_part)
            
            context = ssl.create_default_context()
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"✅ Welcome email sent successfully to: {email}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Welcome email failed to {email}: {str(e)}")
            return False

# Global email service instance
email_service = EmailService()

# ================================
# EMAIL CONFIGURATION INSTRUCTIONS
# ================================

def print_email_setup_instructions():
    """Print instructions for email setup"""
    print("""
╔════════════════════════════════════════════════════════════════════╗
║                    📧 EMAIL SETUP INSTRUCTIONS                    ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  FOR DEVELOPMENT/TESTING:                                          ║
║    Current mode: Emails are logged to console (not sent)          ║
║                                                                    ║
║  TO SEND REAL EMAILS:                                              ║
║    1. Set environment variables:                                   ║
║       export SMTP_USERNAME="your-email@gmail.com"                 ║
║       export SMTP_PASSWORD="your-app-password"                    ║
║                                                                    ║
║    2. For Gmail, use App Password (not regular password):         ║
║       - Go to Gmail → Settings → Security                         ║
║       - Enable 2-factor authentication                            ║
║       - Generate App Password                                     ║
║       - Use that password in SMTP_PASSWORD                        ║
║                                                                    ║
║  📝 NOTE: Verification codes are logged to console for testing    ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
    """)

if __name__ == "__main__":
    print_email_setup_instructions()