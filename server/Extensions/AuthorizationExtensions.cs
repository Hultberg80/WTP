using System.Text.Json;
using server.Classes;

namespace server.Extensions;

public static class AuthorizationExtensions
{
    public static RouteHandlerBuilder RequireRole(this RouteHandlerBuilder builder, int roleId)
    {
        return builder.AddEndpointFilter(async (context, next) =>
        {
            var httpContext = context.HttpContext;
            var userJson = httpContext.Session.GetString("User");
            
            if (string.IsNullOrEmpty(userJson))
            {
                return Results.Unauthorized();
            }
            
            var user = JsonSerializer.Deserialize<User>(userJson);
            
            if (user == null || user.RoleId != roleId)
            {
                return Results.Forbid();
            }
            
            return await next(context);
        });
    }
}