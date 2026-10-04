import nodemailer from 'nodemailer';
export function createMailer(config){
  const configured=!!(config.SMTP_HOST&&config.SMTP_USER&&config.SMTP_PASSWORD&&config.MAIL_FROM);
  if(!configured)return {configured:false};
  const secure=config.SMTP_PORT===465;
  const transport=nodemailer.createTransport({
    host:config.SMTP_HOST,port:config.SMTP_PORT,secure,requireTLS:!secure,
    auth:{user:config.SMTP_USER,pass:config.SMTP_PASSWORD},
    connectionTimeout:10000,greetingTimeout:10000,socketTimeout:10000,
    tls:{minVersion:'TLSv1.2'},
  });
  return {
    configured:true,
    async sendReset(to,url){
      await transport.sendMail({from:config.MAIL_FROM,to,subject:'Reset your AI SEO password',
        text:'You requested a password reset for AI SEO.\n\nOpen this link within 30 minutes:\n'+url+'\n\nIf you did not request this, ignore this email.'});
    },
  };
}

