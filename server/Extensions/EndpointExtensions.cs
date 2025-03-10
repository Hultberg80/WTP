using server.Models;
using System.Text.Json;

namespace server.Extensions;

public static class EndpointExtensions
{
    public static RouteHandlerBuilder RequireRole(this RouteHandlerBuilder builder, string requiredRole)
    {
        return builder.AddEndpointFilter(async (context, next) =>
        {
            var httpContext = context.HttpContext;
            var userJson = httpContext.Session.GetString("User");

            if (userJson == null)
            {
                return Results.Unauthorized();
            }

            var user = JsonSerializer.Deserialize<UserForm>(userJson);
            if (user == null || user.Role != requiredRole)
            {
                return Results.StatusCode(403);
            }

            return await next(context);
        });
    }
}