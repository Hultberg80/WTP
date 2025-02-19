namespace server.Models;

public class DynamicForm
{
    public int Id { get; set; }
    public string FormType { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string CompanyType { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public Dictionary<string, string> Fields { get; set; } = new();
    public string Message { get; set; } = string.Empty;
    public string ChatToken { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
    public bool IsChatActive { get; set; }
}