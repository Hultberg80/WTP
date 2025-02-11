using Microsoft.AspNetCore.Mvc;
using server.Models;
using server.Services;
using server.Data;

namespace server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FormSubmissionsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IEmailService _emailService;

    public FormSubmissionsController(AppDbContext context, IEmailService emailService)
    {
        _context = context;
        _emailService = emailService;
    }

    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] FormSubmission submission)
    {
        submission.ChatToken = Guid.NewGuid().ToString();
        submission.SubmittedAt = DateTime.UtcNow;
        submission.IsChatActive = true;

        _context.FormSubmissions.Add(submission);
        await _context.SaveChangesAsync();

        var chatLink = $"https://din-domain.se/chat/{submission.ChatToken}";
        await _emailService.SendChatInvitation(submission.Email, chatLink, submission.FirstName);

        return Ok(new { message = "Form submitted successfully", chatToken = submission.ChatToken });
    }
}