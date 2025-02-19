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
        
        public DbSet<UserForm> Users { get; set; }
        
        public DbSet<ChatMessage> ChatMessages { get; set; }
        public DbSet<FordonForm> FordonForms { get; set; }
        public DbSet<ForsakringsForm> ForsakringsForms { get; set; }
        public DbSet<TeleForm> TeleForms { get; set; }
        
        public DbSet<InitialFormMessage> InitialFormMessages { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);



            modelBuilder.Entity<FordonForm>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.FirstName).IsRequired();
                entity.Property(e => e.Email).IsRequired();
                entity.Property(e => e.CompanyType).IsRequired();
                entity.Property(e => e.RegistrationNumber).IsRequired();
                entity.Property(e => e.IssueType).IsRequired();
                entity.Property(e => e.Message).IsRequired();
                entity.Property(e => e.ChatToken).IsRequired();
                entity.Property(e => e.SubmittedAt).IsRequired();
                entity.Property(e => e.IsChatActive).IsRequired();

                entity.HasIndex(e => e.ChatToken).IsUnique();
            });
            
            modelBuilder.Entity<ForsakringsForm>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.FirstName).IsRequired();
                entity.Property(e => e.CompanyType).IsRequired();
                entity.Property(e => e.Email).IsRequired();
                entity.Property(e => e.InsuranceType).IsRequired();
                entity.Property(e => e.IssueType).IsRequired();
                entity.Property(e => e.Message).IsRequired();
                entity.Property(e => e.ChatToken).IsRequired();
                entity.Property(e => e.SubmittedAt).IsRequired();
                entity.Property(e => e.IsChatActive).IsRequired();

                entity.HasIndex(e => e.ChatToken).IsUnique();
            });
            
            modelBuilder.Entity<TeleForm>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.FirstName).IsRequired();
                entity.Property(e => e.CompanyType).IsRequired();
                entity.Property(e => e.Email).IsRequired();
                entity.Property(e => e.ServiceType).IsRequired();
                entity.Property(e => e.IssueType).IsRequired();
                entity.Property(e => e.Message).IsRequired();
                entity.Property(e => e.ChatToken).IsRequired();
                entity.Property(e => e.SubmittedAt).IsRequired();
                entity.Property(e => e.IsChatActive).IsRequired();

                entity.HasIndex(e => e.ChatToken).IsUnique();
            });
            modelBuilder.Entity<UserForm>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.FirstName)
                    .IsRequired()
                    .HasMaxLength(50);
                
                entity.Property(e => e.Password)
                    .IsRequired()
                    .HasMaxLength(100);
                
                entity.Property(e => e.Company)     // Ny property
                    .IsRequired()
                    .HasMaxLength(50);
                    
                entity.Property(e => e.Role)
                    .IsRequired()
                    .HasMaxLength(20)
                    .HasDefaultValue("staff");

                entity.Property(e => e.CreatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");
                    

            });
            
            modelBuilder.Entity<InitialFormMessage>()
                .ToView("InitialFormMessages")
                .HasNoKey();
            
            modelBuilder.Entity<ChatMessage>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ChatToken).IsRequired().HasMaxLength(255);
                entity.Property(e => e.Sender).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Message).IsRequired();
                entity.Property(e => e.Timestamp).IsRequired();
            });
            
        }
    }
}