using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace server.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreateNew : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ChatMessages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ChatToken = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Sender = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Message = table.Column<string>(type: "text", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChatMessages", x => x.Id);
                });

            migrationBuilder.CreateTable(
    name: "FordonForms",
    columns: table => new
    {
        Id = table.Column<int>(type: "integer", nullable: false)
            .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
        FirstName = table.Column<string>(type: "text", nullable: false),
        Email = table.Column<string>(type: "text", nullable: false),
        RegistrationNumber = table.Column<string>(type: "text", nullable: false),
        IssueType = table.Column<string>(type: "text", nullable: false),
        Message = table.Column<string>(type: "text", nullable: false),
        ChatToken = table.Column<string>(type: "text", nullable: false),
        SubmittedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
        IsChatActive = table.Column<bool>(type: "boolean", nullable: false)
    },
    constraints: table =>
    {
        table.PrimaryKey("PK_FordonForms", x => x.Id);
    });

migrationBuilder.CreateTable(
    name: "ForsakringsForms",
    columns: table => new
    {
        Id = table.Column<int>(type: "integer", nullable: false)
            .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
        FirstName = table.Column<string>(type: "text", nullable: false),
        Email = table.Column<string>(type: "text", nullable: false),
        InsuranceType = table.Column<string>(type: "text", nullable: false),
        IssueType = table.Column<string>(type: "text", nullable: false),
        Message = table.Column<string>(type: "text", nullable: false),
        ChatToken = table.Column<string>(type: "text", nullable: false),
        SubmittedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
        IsChatActive = table.Column<bool>(type: "boolean", nullable: false)
    },
    constraints: table =>
    {
        table.PrimaryKey("PK_ForsakringsForms", x => x.Id);
    });

migrationBuilder.CreateTable(
    name: "TeleForms",
    columns: table => new
    {
        Id = table.Column<int>(type: "integer", nullable: false)
            .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
        FirstName = table.Column<string>(type: "text", nullable: false),
        Email = table.Column<string>(type: "text", nullable: false),
        ServiceType = table.Column<string>(type: "text", nullable: false),
        IssueType = table.Column<string>(type: "text", nullable: false),
        Message = table.Column<string>(type: "text", nullable: false),
        ChatToken = table.Column<string>(type: "text", nullable: false),
        SubmittedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
        IsChatActive = table.Column<bool>(type: "boolean", nullable: false)
    },
    constraints: table =>
    {
        table.PrimaryKey("PK_TeleForms", x => x.Id);
    });

migrationBuilder.CreateTable(
    name: "Users",
    columns: table => new
    {
        Id = table.Column<int>(type: "integer", nullable: false)
            .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
        FirstName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
        Password = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
        CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
        Role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "user")
    },
    constraints: table =>
    {
        table.PrimaryKey("PK_Users", x => x.Id);
    });

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ChatMessages");
migrationBuilder.DropTable(
    name: "FordonForms");

migrationBuilder.DropTable(
    name: "ForsakringsForms");

migrationBuilder.DropTable(
    name: "TeleForms");

migrationBuilder.DropTable(
    name: "Users");


            
        }
    }
}
