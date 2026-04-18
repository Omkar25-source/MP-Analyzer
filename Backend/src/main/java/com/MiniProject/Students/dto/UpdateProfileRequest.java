package com.MiniProject.Students.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class UpdateProfileRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    // Optional extended fields
    private String phone;
    private String semester;
    private String branch;

    public String getName()                   { return name; }
    public void setName(String name)          { this.name = name; }

    public String getEmail()                  { return email; }
    public void setEmail(String email)        { this.email = email; }

    public String getPhone()                  { return phone; }
    public void setPhone(String phone)        { this.phone = phone; }

    public String getSemester()               { return semester; }
    public void setSemester(String semester)  { this.semester = semester; }

    public String getBranch()                 { return branch; }
    public void setBranch(String branch)      { this.branch = branch; }
}
