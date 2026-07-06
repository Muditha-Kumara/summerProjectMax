import nodemailer from 'nodemailer';
import config from '../config/index.js';
import logger from '../utils/logger.js';

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.pass
      }
    });
  }

  async sendBookingConfirmation(booking) {
    try {
      const bookingUrl = `${config.frontendUrl}/?pin=${booking.pin}`;
      
      const mailOptions = {
        from: config.email.from,
        to: booking.guest_email,
        subject: 'Your Smart Heating Access - Booking Confirmation',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Welcome to Your Smart Cottage!</h1>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #1f2937;">Your Access Details</h2>
              <p style="font-size: 18px;"><strong>Guest Name:</strong> ${booking.guest_name}</p>
              <p style="font-size: 18px;"><strong>Check-in:</strong> ${new Date(booking.check_in).toLocaleString('fi-FI')}</p>
              <p style="font-size: 18px;"><strong>Check-out:</strong> ${new Date(booking.check_out).toLocaleString('fi-FI')}</p>
              
              <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <p style="font-size: 24px; margin: 0;"><strong>Your PIN Code:</strong></p>
                <p style="font-size: 48px; font-weight: bold; color: #2563eb; margin: 10px 0;">${booking.pin}</p>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${bookingUrl}" 
                 style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 18px; display: inline-block;">
                Access Heating Dashboard
              </a>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Quick Tips:</strong></p>
              <ul style="margin: 10px 0;">
                <li>Use your PIN to log in to the dashboard</li>
                <li>Adjust room temperatures easily with large sliders</li>
                <li>Use quick modes: Home, Away, Eco, Comfort</li>
                <li>Press the microphone button for voice assistance</li>
              </ul>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
              If you have any questions, please contact the cottage owner.
            </p>
          </div>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Booking confirmation email sent', { messageId: info.messageId, to: booking.guest_email });
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      logger.error('Failed to send booking confirmation email', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async sendTemperatureAlert(room, currentTemp, threshold) {
    try {
      const mailOptions = {
        from: config.email.from,
        to: config.email.user, // Send to admin
        subject: `⚠️ Temperature Alert: ${room.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">Temperature Alert</h1>
            
            <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #991b1b;">${room.name}</h2>
              <p style="font-size: 24px;"><strong>Current Temperature:</strong> ${currentTemp}°C</p>
              <p style="font-size: 18px;"><strong>Threshold:</strong> ${threshold}°C</p>
              <p style="font-size: 16px; color: #7f1d1d;">
                The temperature has dropped below the critical threshold. 
                Please check the heating system immediately.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${config.frontendUrl}/admin" 
                 style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 18px; display: inline-block;">
                View Dashboard
              </a>
            </div>
          </div>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Temperature alert email sent', { messageId: info.messageId, room: room.name });
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      logger.error('Failed to send temperature alert email', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

export default new EmailService();
