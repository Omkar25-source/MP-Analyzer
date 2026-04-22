package com.MiniProject.Students.repository;

import com.MiniProject.Students.model.AttendanceRecord;
import com.MiniProject.Students.model.Subject;
import com.MiniProject.Students.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AttendanceRepository extends JpaRepository<AttendanceRecord, Long> {

    List<AttendanceRecord> findByUser(User user);

    List<AttendanceRecord> findByUserAndSubject(User user, Subject subject);

    Optional<AttendanceRecord> findByIdAndUser(Long id, User user);
}
