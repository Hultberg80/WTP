using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace server.Migrations
{
    /// <summary>
    /// Initial migration som skapar grundläggande databasstruktur
    /// </summary>
    public partial class InitialCreate : Migration
    {
        /// <summary>
        /// Definierar hur databasen ska skapas/uppdateras
        /// </summary>
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Skapar tabell för fordonsformulär
            migrationBuilder.CreateTable(
                name: "FordonForms",
                columns: table => new
                {
                    // Primärnyckel med auto-increment
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    // Obligatoriska textfält för formuläret
                    FirstName = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    RegistrationNumber = table.Column<string>(type: "text", nullable: false),
                    IssueType = table.Column<string>(type: "text", nullable: false),
                    Message = table.Column<string>(type: "text", nullable: false),
                    ChatToken = table.Column<string>(type: "text", nullable: false),
                    // Tidsstämpel för när formuläret skickades in
                    SubmittedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    // Status för chatten
                    IsChatActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FordonForms", x => x.Id);
                });

            // Skapar tabell för försäkringsformulär
            migrationBuilder.CreateTable(
                name: "ForsakringsForms",
                columns: table => new
                {
                    // Liknande struktur som FordonForms men med InsuranceType istället för RegistrationNumber
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

            // Skapar tabell för telefoniformulär
            migrationBuilder.CreateTable(
                name: "TeleForms",
                columns: table => new
                {
                    // Liknande struktur som övriga formulär men med ServiceType
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

            // Skapar tabell för användare
            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    // Användardata med begränsningar på fältlängder
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FirstName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Password = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    // Automatisk tidsstämpel vid skapande
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    // Standardroll sätts till "user"
                    Role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "user")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            // Skapar unika index för chattokens i alla formulärtabeller
            migrationBuilder.CreateIndex(
                name: "IX_FordonForms_ChatToken",
                table: "FordonForms",
                column: "ChatToken",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ForsakringsForms_ChatToken",
                table: "ForsakringsForms",
                column: "ChatToken",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TeleForms_ChatToken",
                table: "TeleForms",
                column: "ChatToken",
                unique: true);
        }

        /// <summary>
        /// Definierar hur migrationen ska rullas tillbaka
        /// </summary>
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Tar bort alla tabeller i omvänd ordning
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