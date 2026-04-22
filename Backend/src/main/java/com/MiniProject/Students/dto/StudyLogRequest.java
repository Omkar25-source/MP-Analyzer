package com.MiniProject.Students.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class StudyLogRequest {

    @NotNull(message = "subjectId is required")
    private Long subjectId;

    @Min(value = 1, message = "durationMinutes must be at least 1")
    private int durationMinutes;

    @NotNull(message = "date is required")
    private String date;   // YYYY-MM-DD from frontend

    private String notes;

    public Long getSubjectId()                   { return subjectId; }
    public void setSubjectId(Long subjectId)     { this.subjectId = subjectId; }

    public int getDurationMinutes()              { return durationMinutes; }
    public void setDurationMinutes(int d)        { this.durationMinutes = d; }

    public String getDate()                      { return date; }
    public void setDate(String date)             { this.date = date; }

    public String getNotes()                     { return notes; }
    public void setNotes(String notes)           { this.notes = notes; }
}
