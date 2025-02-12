namespace server.Models;

public class AutoServiceSubmission
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string CarRegistration { get; set; } = string.Empty;  // regnr
    public string IssueType { get; set; } = string.Empty;  // vad det gäller
    public string Message { get; set; } = string.Empty;
    public string ChatToken { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
    public bool IsChatActive { get; set; }  // Lägger till denna för chatfunktionalitet
}