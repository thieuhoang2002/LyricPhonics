using System;

namespace LyricPhonics.Domain.Entities;

/// <summary>
/// Đại diện cho API Key của AI Engine (Gemini, Groq) quản lý trong vũ trụ Admin bí mật.
/// </summary>
public class ApiKeyEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Nhà cung cấp: 'gemini' hoặc 'groq'
    /// </summary>
    public string Provider { get; set; } = "gemini";

    public string KeyValue { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Trạng thái sức khỏe: 'Healthy', 'Degraded', 'Exhausted', 'Dead'
    /// </summary>
    public string Status { get; set; } = "Healthy";

    public DateTime? LastCheckedAt { get; set; }

    public long? LatencyMs { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
