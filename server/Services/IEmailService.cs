namespace server.Services;

public interface IEmailService
{
    Task SendChatInvitation(string recipientEmail, string chatLink, string firstName);
}