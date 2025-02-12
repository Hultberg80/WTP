namespace server.Models;

public class TelecomSubmission
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string ServiceType { get; set; } = string.Empty;  // typ av tjänst
    public string IssueType { get; set; } = string.Empty;  // vad gäller ditt ärende
    public string Message { get; set; } = string.Empty;
    public string ChatToken { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
    public bool IsChatActive { get; set; }
}