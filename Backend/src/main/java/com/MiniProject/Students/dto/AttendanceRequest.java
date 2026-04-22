package com.MiniProject.Students.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class AttendanceRequest {

    @NotBlank(message = "Date is required")
    private String date;           // YYYY-MM-DD

    @NotBlank(message = "Status is required")
    private String status;         // PRESENT | ABSENT | LATE

    @NotNull(message = "Subject is required")
    private Long subjectId;

    public String getDate()               { return date; }
    public void setDate(String date)      { this.date = date; }
    public String getStatus()             { return status; }
    public void setStatus(String status)  { this.status = status; }
    public Long getSubjectId()            { return subjectId; }
    public void setSubjectId(Long id)     { this.subjectId = id; }
}
