package com.MiniProject.Students.dto;

import jakarta.validation.constraints.NotBlank;

public class SubjectRequest {
    @NotBlank(message = "Subject name is required")
    private String name;

    public String getName()            { return name; }
    public void setName(String name)   { this.name = name; }
}
