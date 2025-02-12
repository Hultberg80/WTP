namespace server.Models;



public class InsuranceSubmission
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string InsuranceType { get; set; } = string.Empty;  // typ av försäkring
    public string IssueType { get; set; } = string.Empty;  // vad gäller ditt ärende
    public string Message { get; set; } = string.Empty;
    public string ChatToken { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
    public bool IsChatActive { get; set; }
}