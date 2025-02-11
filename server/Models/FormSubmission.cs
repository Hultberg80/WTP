
namespace server.Models;

public class FormSubmission
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Gender { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string About { get; set; } = string.Empty;
    public string ChatToken { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
    public bool IsChatActive { get; set; }
} 
