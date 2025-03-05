namespace server.Services;

public interface IEmailService
{
    Task SendChatInvitation(string recipientEmail, string chatLink, string firstName);
    Task SendUserCredentials(string recipientEmail, string firstName, string password);
}