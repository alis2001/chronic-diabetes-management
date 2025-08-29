# services/admin-dashboard/app/email_service.py
"""
Professional Email Service for Admin Authentication
Clean backend service for 6-digit verification codes
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
        # Email configuration - Update these for production
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "admin@gesan.it")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "your-app-password")
        
        # Company configuration
        self.company_name = "Gesan Healthcare Systems"
        self.system_name = "Sistema Gestione Diabetes Cronico"
        self.support_email = "support@gesan.it"
        
    def generate_verification_code(self) -> str:
        """Generate secure 6-digit verification code"""
        return f"{random.randint(100000, 999999)}"
    
    def _create_simple_email_template(self, nome: str, cognome: str, code: str, purpose: str = "signup") -> str:
        """Create clean email template without excessive styling"""
        
        if purpose == "signup":
            subject = "Verifica Account"
            header = "Registrazione Sistema Amministrativo"
            message = f"Gentile {nome} {cognome}, completa la registrazione inserendo il codice:"
        else:  # login
            subject = "Codice Accesso"
            header = "Accesso Sistema"
            message = f"Gentile {nome} {cognome}, inserisci il codice per accedere:"
        
        # Simple, clean HTML template
        template = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>{subject}</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #3b82f6;">🏥 {header}</h1>
                <h2>{self.company_name}</h2>
                <p>{self.system_name}</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p>{message}</p>
                
                <div style="text-align: center; margin: 20px 0;">
                    <div style="font-size: 32px; font-weight: bold; color: #1d4ed8; 
                               letter-spacing: 4px; font-family: monospace; 
                               background: white; padding: 15px; border-radius: 5px; 
                               border: 2px solid #3b82f6; display: inline-block;">
                        {code}
                    </div>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; text-align: center;">
                    Il codice scade tra 15 minuti
                </p>
            </div>
            
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4 style="color: #dc2626; margin: 0 0 10px 0;">Sicurezza:</h4>
                <ul style="color: #7f1d1d; font-size: 14px;">
                    <li>Non condividere questo codice</li>
                    <li>Codice valido solo per 15 minuti</li>
                    <li>Contatta {self.support_email} per problemi</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px;">
                <p>{self.company_name} - Sistema Amministrativo</p>
                <p>Messaggio automatico - Non rispondere</p>
            </div>
        </body>
        </html>
        """
        
        return template
    
    async def send_verification_email(
        self, 
        email: str, 
        nome: str, 
        cognome: str, 
        code: str, 
        purpose: str = "signup"
    ) -> bool:
        """Send verification email with 6-digit code"""
        
        try:
            # Create message
            message = MIMEMultipart("alternative")
            
            if purpose == "signup":
                subject = f"Verifica Account - {self.company_name}"
            else:
                subject = f"Codice Accesso - {self.company_name}"
                
            message["Subject"] = subject
            message["From"] = f"{self.company_name} <{self.smtp_username}>"
            message["To"] = email
            
            # Create simple text version
            text_content = f"""
{self.company_name}
{self.system_name}

Gentile {nome} {cognome},

Il tuo codice di verifica è: {code}

Il codice scade tra 15 minuti.

Per sicurezza:
- Non condividere questo codice
- Contatta {self.support_email} per problemi

{self.company_name}
            """
            
            text_part = MIMEText(text_content, "plain")
            message.attach(text_part)
            
            # Create HTML version
            html_content = self._create_simple_email_template(nome, cognome, code, purpose)
            html_part = MIMEText(html_content, "html")
            message.attach(html_part)
            
            # Send email
            context = ssl.create_default_context()
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(message)
            
            logger.info(f"Verification email sent to {email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {email}: {str(e)}")
            return False
    
    async def send_welcome_email(self, email: str, nome: str, cognome: str) -> bool:
        """Send simple welcome email after verification"""
        
        try:
            message = MIMEMultipart("alternative")
            message["Subject"] = f"Account Attivato - {self.company_name}"
            message["From"] = f"{self.company_name} <{self.smtp_username}>"
            message["To"] = email
            
            # Simple welcome message
            content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #10b981;">🎉 Account Attivato!</h1>
                    <h2>{self.company_name}</h2>
                </div>
                
                <div style="background: #f0fdf4; padding: 20px; border-radius: 8px;">
                    <h3>Benvenuto/a {nome} {cognome}!</h3>
                    <p>Il tuo account amministratore è stato attivato con successo.</p>
                    <p>Ora puoi accedere al sistema amministrativo.</p>
                </div>
                
                <div style="text-align: center; margin-top: 30px; color: #6b7280;">
                    <p>Il Team {self.company_name}</p>
                </div>
            </body>
            </html>
            """
            
            html_part = MIMEText(content, "html")
            message.attach(html_part)
            
            context = ssl.create_default_context()
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(message)
            
            logger.info(f"Welcome email sent to {email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send welcome email to {email}: {str(e)}")
            return False
    
    def validate_email_domain(self, email: str) -> bool:
        """Validate email is from @gesan.it domain"""
        return email.lower().endswith('@gesan.it')
    
    async def test_connection(self) -> bool:
        """Test SMTP connection"""
        try:
            context = ssl.create_default_context()
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.smtp_username, self.smtp_password)
            logger.info("SMTP connection test successful")
            return True
        except Exception as e:
            logger.error(f"SMTP connection test failed: {str(e)}")
            return False

# Global email service instance
email_service = EmailService()

# Email configuration validation
def validate_email_config() -> Dict[str, Any]:
    """Validate email service configuration"""
    config_status = {
        "smtp_configured": bool(os.getenv("SMTP_USERNAME") and os.getenv("SMTP_PASSWORD")),
        "smtp_server": email_service.smtp_server,
        "smtp_port": email_service.smtp_port,
        "company_domain": "@gesan.it",
        "support_email": email_service.support_email
    }
    return config_status