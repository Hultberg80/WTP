using Microsoft.EntityFrameworkCore;
using server.Models;

namespace server.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<AutoServiceSubmission> AutoServiceSubmissions { get; set; }
        public DbSet<TelecomSubmission> TelecomSubmissions { get; set; }
        public DbSet<InsuranceSubmission> InsuranceSubmissions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Auto Service configuration
            modelBuilder.Entity<AutoServiceSubmission>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.FirstName).IsRequired();
                entity.Property(e => e.Email).IsRequired();
                entity.Property(e => e.CarRegistration).IsRequired();
                entity.Property(e => e.IssueType).IsRequired();
                entity.Property(e => e.Message).IsRequired();
                entity.Property(e => e.ChatToken).IsRequired();
                entity.Property(e => e.SubmittedAt).IsRequired();

                // Skapa ett unikt index för ChatToken
                entity.HasIndex(e => e.ChatToken).IsUnique();
            });

            // Telecom configuration
            modelBuilder.Entity<TelecomSubmission>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.FirstName).IsRequired();
                entity.Property(e => e.Email).IsRequired();
                entity.Property(e => e.ServiceType).IsRequired();
                entity.Property(e => e.IssueType).IsRequired();
                entity.Property(e => e.Message).IsRequired();
                entity.Property(e => e.ChatToken).IsRequired();
                entity.Property(e => e.SubmittedAt).IsRequired();

                // Skapa ett unikt index för ChatToken
                entity.HasIndex(e => e.ChatToken).IsUnique();
            });

            // Insurance configuration
            modelBuilder.Entity<InsuranceSubmission>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.FirstName).IsRequired();
                entity.Property(e => e.Email).IsRequired();
                entity.Property(e => e.InsuranceType).IsRequired();
                entity.Property(e => e.IssueType).IsRequired();
                entity.Property(e => e.Message).IsRequired();
                entity.Property(e => e.ChatToken).IsRequired();
                entity.Property(e => e.SubmittedAt).IsRequired();

                // Skapa ett unikt index för ChatToken
                entity.HasIndex(e => e.ChatToken).IsUnique();
            });
        }
    }
}