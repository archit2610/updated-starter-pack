import Mailgen from "mailgen";
interface SendEmailOptions {
    email: string;
    subject: string;
    mailgenContent: Mailgen.Content;
}
declare const sendEmail: (options: SendEmailOptions) => Promise<void>;
declare const emailVerificationMailgenContent: (username: string, verificationUrl: string) => {
    body: {
        name: string;
        intro: string;
        action: {
            instructions: string;
            button: {
                color: string;
                text: string;
                link: string;
            };
        };
        outro: string;
    };
};
declare const forgotPasswordMailgenContent: (username: string, passwordResetUrl: string) => {
    body: {
        name: string;
        intro: string;
        action: {
            instructions: string;
            button: {
                color: string;
                text: string;
                link: string;
            };
        };
        outro: string;
    };
};
export { emailVerificationMailgenContent, forgotPasswordMailgenContent, sendEmail, };
//# sourceMappingURL=mail.d.ts.map