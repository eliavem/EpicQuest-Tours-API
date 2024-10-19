const nodemailer = require("nodemailer");

module.exports = class Email {

  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split("")[0];
    this.url = url;
    this.from = `admin2 <${process.env.EMAIL_FROM}>`;
    // this.from = `ali <${process.env.SENDGRID_EMAIL_FROM}>`;
  }

  newTransport() {
    if(process.env.NODE_ENV === 'production') {
      console.log('in production');
      return nodemailer.createTransport({
        host: process.env.SENDGRID_EMAIL_HOST,
        port: process.env.SENDGRID_EMAIL_PORT,
        secure: false,
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD
        }
      });
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });

  }

  //send the actual email
  async send(template, subject) {
    // console.log(`Sending email with subject: ${subject}`);
    // Define Email Options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      text: template
    };

    // console.log('mailOptions', mailOptions);
    // Create Transporter and send email
    try {
      await this.newTransport().sendMail(mailOptions);
      console.log('Email sent successfully');
    } catch (err) {
      console.error('Error sending email:', err); // Log the full error object
      throw new Error('Email sending failed');
    }
    // await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('Welcome', 'Welcome to EpicTours!')
  }

  async sendPasswordReset(message) {
    // console.log('in reset password method');
    await this.send(message, 'Your password reset token (valid for 10 min)')
  }

}
