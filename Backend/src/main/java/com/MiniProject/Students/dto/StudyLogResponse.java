package com.MiniProject.Students.dto;

import java.time.LocalDate;

public class StudyLogResponse {

    private Long   id;
    private Long   subjectId;
    private String subjectName;
    private int    durationMinutes;
    private String date;
    private String notes;

    public StudyLogResponse(Long id, Long subjectId, String subjectName,
                            int durationMinutes, LocalDate date, String notes) {
        this.id              = id;
        this.subjectId       = subjectId;
        this.subjectName     = subjectName;
        this.durationMinutes = durationMinutes;
        this.date            = date.toString();
        this.notes           = notes;
    }

    public Long   getId()              { return id;              }
    public Long   getSubjectId()       { return subjectId;       }
    public String getSubjectName()     { return subjectName;     }
    public int    getDurationMinutes() { return durationMinutes; }
    public String getDate()            { return date;            }
    public String getNotes()           { return notes;           }
}
