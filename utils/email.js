const nodemailer = require("nodemailer");

module.exports = class Email {

  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split("")[0];
    this.url = url;
    this.from = `admin2 <${process.env.EMAIL_FROM}>`
  }

  newTransport() {
    if(process.env.NODE_ENV === 'production') {
      return 1;
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
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('Welcome', 'Welcome to EpicTours!')
  }

  async sendPasswordReset(message) {
    // console.log('in reset password method');
    await this.send(message, 'Your password reset token (valid for 10 min)')
  }

}
