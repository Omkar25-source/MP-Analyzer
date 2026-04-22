package com.MiniProject.Students.dto;

import java.util.List;
import java.util.Map;

/**
 * Flat dashboard payload — no extra nesting.
 * todayMinutes / weekMinutes are raw; frontend converts to hours.
 */
public class DashboardStatsResponse {

    private int todayMinutes;
    private int weekMinutes;
    private int streak;
    private List<Map<String, Object>> subjectBreakdown;

    public DashboardStatsResponse(int todayMinutes, int weekMinutes, int streak,
                                  List<Map<String, Object>> subjectBreakdown) {
        this.todayMinutes     = todayMinutes;
        this.weekMinutes      = weekMinutes;
        this.streak           = streak;
        this.subjectBreakdown = subjectBreakdown;
    }

    public int getTodayMinutes()                               { return todayMinutes; }
    public int getWeekMinutes()                                { return weekMinutes;  }
    public int getStreak()                                     { return streak;       }
    public List<Map<String, Object>> getSubjectBreakdown()    { return subjectBreakdown; }
}
