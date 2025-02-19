using Microsoft.EntityFrameworkCore;
using server.Models;

namespace server.Data
{
   public class AppDbContext : DbContext
   {
       public DbSet<DynamicForm> DynamicForms { get; set; } = null!;
       public DbSet<FormConfiguration> FormConfigurations { get; set; } = null!;
       public DbSet<ChatMessage> ChatMessages { get; set; } = null!;
       public DbSet<UserForm> Users { get; set; } = null!;
       public DbSet<DynamicMessage> DynamicMessages { get; set; } = null!;

       public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
       {
       }

       protected override void OnModelCreating(ModelBuilder modelBuilder)
       {
           base.OnModelCreating(modelBuilder);

           // DynamicForm konfiguration
           modelBuilder.Entity<DynamicForm>(entity =>
           {
               entity.HasKey(e => e.Id);
               entity.Property(e => e.FormType).HasMaxLength(50).IsRequired();
               entity.Property(e => e.FirstName).HasMaxLength(100).IsRequired();
               entity.Property(e => e.CompanyType).HasMaxLength(100).IsRequired();
               entity.Property(e => e.Email).HasMaxLength(255).IsRequired();
               entity.Property(e => e.Fields).HasColumnType("jsonb").IsRequired();
               entity.Property(e => e.Message).HasColumnType("text").IsRequired();
               entity.Property(e => e.ChatToken).HasMaxLength(255).IsRequired();
               entity.Property(e => e.SubmittedAt).IsRequired();
               entity.Property(e => e.IsChatActive).IsRequired();
               
               entity.HasIndex(e => e.ChatToken).IsUnique();
           });

           // FormConfiguration konfiguration
           modelBuilder.Entity<FormConfiguration>(entity =>
           {
               entity.HasKey(e => e.Id);
               entity.Property(e => e.FormType).HasMaxLength(50).IsRequired();
               entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
               entity.Property(e => e.Configuration).HasColumnType("jsonb").IsRequired();
               entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);
               entity.Property(e => e.CreatedAt)
                   .IsRequired()
                   .HasDefaultValueSql("CURRENT_TIMESTAMP");
               entity.Property(e => e.UpdatedAt)
                   .IsRequired()
                   .HasDefaultValueSql("CURRENT_TIMESTAMP");
               
               entity.HasIndex(e => e.FormType).IsUnique();
           });

           // ChatMessage konfiguration
           modelBuilder.Entity<ChatMessage>(entity =>
           {
               entity.HasKey(e => e.Id);
               entity.Property(e => e.ChatToken).HasMaxLength(255).IsRequired();
               entity.Property(e => e.Sender).HasMaxLength(100).IsRequired();
               entity.Property(e => e.Message).HasColumnType("text").IsRequired();
               entity.Property(e => e.Timestamp).IsRequired();
           });

           // UserForm konfiguration
           modelBuilder.Entity<UserForm>(entity =>
           {
               entity.HasKey(e => e.Id);
               entity.Property(e => e.FirstName).HasMaxLength(50).IsRequired();
               entity.Property(e => e.Password).HasMaxLength(100).IsRequired();
               entity.Property(e => e.Company).HasMaxLength(50).IsRequired();
               entity.Property(e => e.Role)
                   .HasMaxLength(20)
                   .IsRequired()
                   .HasDefaultValue("staff");
               entity.Property(e => e.CreatedAt)
                   .IsRequired()
                   .HasDefaultValueSql("CURRENT_TIMESTAMP");
           });

           // DynamicMessage View konfiguration
           modelBuilder.Entity<DynamicMessage>()
               .ToView("DynamicMessages")
               .HasNoKey();
       }
   }
}