package org.example;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.FileOutputStream;
import java.io.IOException;
import java.sql.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class EmployeeDataExporter {

  private static final String DB_URL = "jdbc:postgresql://localhost:5432/employee_db";
  private static final String DB_USERNAME = "postgres";
  private static final String DB_PASSWORD = "Nry369&2008";

  private static final ExecutorService executorService = Executors.newFixedThreadPool(10);

  public static void main(String[] args) {
    for (int i = 0; i < 5; i++) {
      String outputFileName = "employee_data_" + i + ".xlsx";
      executorService.submit(() -> {
        try (Connection connection = getConnection()) {
          exportEmployeeData(connection, outputFileName);
        } catch (SQLException e) {
          System.err.println("Error creating database connection: " + e.getMessage());
        }
      });
    }
    executorService.shutdown();
  }

  private static Connection getConnection() throws SQLException {
    return DriverManager.getConnection(DB_URL, DB_USERNAME, DB_PASSWORD);
  }

  private static void exportEmployeeData(Connection connection, String outputFileName) {
    String query = "SELECT employee_id, employee_name, employee_department, employee_salary FROM public.employee_info";

    try (PreparedStatement statement = connection.prepareStatement(query);
         ResultSet resultSet = statement.executeQuery();
         Workbook workbook = new XSSFWorkbook()) {

      // Create Excel sheet and populate data
      Sheet sheet = workbook.createSheet("Employee Data");
      createHeaderRow(sheet);

      int rowNum = 1;
      while (resultSet.next()) {
        Row row = sheet.createRow(rowNum++);
        row.createCell(0).setCellValue(resultSet.getInt("employee_id"));
        row.createCell(1).setCellValue(resultSet.getString("employee_name"));
        row.createCell(2).setCellValue(resultSet.getString("employee_department"));
        row.createCell(3).setCellValue(resultSet.getDouble("employee_salary"));
      }

      try (FileOutputStream fileOut = new FileOutputStream(outputFileName)) {
        workbook.write(fileOut);
      }
      System.out.println("Export completed for: " + outputFileName);
    } catch (SQLException | IOException e) {
      System.err.println("Error exporting data: " + e.getMessage());
    }
  }

  private static void createHeaderRow(Sheet sheet) {
    Row headerRow = sheet.createRow(0);
    headerRow.createCell(0).setCellValue("ID");
    headerRow.createCell(1).setCellValue("Name");
    headerRow.createCell(2).setCellValue("Department");
    headerRow.createCell(3).setCellValue("Salary");
  }
}
