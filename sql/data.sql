/*
 Navicat Premium Dump SQL

 Source Server         : 128
 Source Server Type    : MySQL
 Source Server Version : 90001 (9.0.1)
 Source Host           : 10.31.0.128:3306
 Source Schema         : data

 Target Server Type    : MySQL
 Target Server Version : 90001 (9.0.1)
 File Encoding         : 65001

 Date: 26/03/2026 18:01:42
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for AssessmentMethod
-- ----------------------------
DROP TABLE IF EXISTS `AssessmentMethod`;
CREATE TABLE `AssessmentMethod`  (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `courseId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sortOrder` int NOT NULL,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('PROCESS','RESULT','OTHER') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fullScore` decimal(8, 2) NOT NULL DEFAULT 100.00,
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `AssessmentMethod_courseId_sortOrder_key`(`courseId` ASC, `sortOrder` ASC) USING BTREE,
  CONSTRAINT `AssessmentMethod_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for Course
-- ----------------------------
DROP TABLE IF EXISTS `Course`;
CREATE TABLE `Course`  (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `courseName` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `courseCode` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `courseType` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `semester` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `className` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `major` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `teacherNames` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `ownerTeacher` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `hours` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `credit` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `selectedCount` int NOT NULL DEFAULT 0,
  `evaluatedCount` int NOT NULL DEFAULT 0,
  `targetCount` int NOT NULL DEFAULT 7,
  `expectedValue` decimal(6, 4) NOT NULL DEFAULT 0.6500,
  `directWeight` decimal(6, 4) NOT NULL DEFAULT 0.8000,
  `indirectWeight` decimal(6, 4) NOT NULL DEFAULT 0.2000,
  `surveyWeight` decimal(6, 4) NOT NULL DEFAULT 1.0000,
  `analysisText` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `problemText` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `improvementText` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `teacherComment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `Course_courseName_semester_className_key`(`courseName` ASC, `semester` ASC, `className` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for CourseTarget
-- ----------------------------
DROP TABLE IF EXISTS `CourseTarget`;
CREATE TABLE `CourseTarget`  (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `courseId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sortOrder` int NOT NULL,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `graduationRequirement` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `supportStrength` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `overallWeight` decimal(8, 4) NOT NULL DEFAULT 0.0000,
  `processEvaluationRatio` decimal(8, 4) NOT NULL DEFAULT 0.0000,
  `resultEvaluationRatio` decimal(8, 4) NOT NULL DEFAULT 0.0000,
  `surveyEvaluationRatio` decimal(8, 4) NOT NULL DEFAULT 1.0000,
  `directWeight` decimal(8, 4) NOT NULL DEFAULT 0.8000,
  `indirectWeight` decimal(8, 4) NOT NULL DEFAULT 0.2000,
  `otherEvaluationRatio` decimal(8, 4) NOT NULL DEFAULT 0.0000,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `CourseTarget_courseId_sortOrder_key`(`courseId` ASC, `sortOrder` ASC) USING BTREE,
  CONSTRAINT `CourseTarget_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ExamQuestion
-- ----------------------------
DROP TABLE IF EXISTS `ExamQuestion`;
CREATE TABLE `ExamQuestion`  (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `courseId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sortOrder` int NOT NULL,
  `label` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `score` decimal(8, 2) NOT NULL DEFAULT 0.00,
  `targetScores` json NOT NULL,
  `targetLabels` json NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `ExamQuestion_courseId_sortOrder_key`(`courseId` ASC, `sortOrder` ASC) USING BTREE,
  CONSTRAINT `ExamQuestion_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for IndirectEvaluation
-- ----------------------------
DROP TABLE IF EXISTS `IndirectEvaluation`;
CREATE TABLE `IndirectEvaluation`  (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `courseId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `targetId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `countA` int NOT NULL DEFAULT 0,
  `countB` int NOT NULL DEFAULT 0,
  `countC` int NOT NULL DEFAULT 0,
  `countD` int NOT NULL DEFAULT 0,
  `countE` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `IndirectEvaluation_targetId_key`(`targetId` ASC) USING BTREE,
  INDEX `IndirectEvaluation_courseId_fkey`(`courseId` ASC) USING BTREE,
  CONSTRAINT `IndirectEvaluation_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `IndirectEvaluation_targetId_fkey` FOREIGN KEY (`targetId`) REFERENCES `CourseTarget` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for Student
-- ----------------------------
DROP TABLE IF EXISTS `Student`;
CREATE TABLE `Student`  (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `courseId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sortOrder` int NOT NULL,
  `majorName` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `className` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `studentNo` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `studentName` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `Student_courseId_studentNo_key`(`courseId` ASC, `studentNo` ASC) USING BTREE,
  CONSTRAINT `Student_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for StudentScore
-- ----------------------------
DROP TABLE IF EXISTS `StudentScore`;
CREATE TABLE `StudentScore`  (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `courseId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `studentId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `methodId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `targetId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `score` decimal(8, 2) NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `StudentScore_studentId_methodId_targetId_key`(`studentId` ASC, `methodId` ASC, `targetId` ASC) USING BTREE,
  INDEX `StudentScore_courseId_fkey`(`courseId` ASC) USING BTREE,
  INDEX `StudentScore_methodId_fkey`(`methodId` ASC) USING BTREE,
  INDEX `StudentScore_targetId_fkey`(`targetId` ASC) USING BTREE,
  CONSTRAINT `StudentScore_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `StudentScore_methodId_fkey` FOREIGN KEY (`methodId`) REFERENCES `AssessmentMethod` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `StudentScore_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `StudentScore_targetId_fkey` FOREIGN KEY (`targetId`) REFERENCES `CourseTarget` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for TargetMethodConfig
-- ----------------------------
DROP TABLE IF EXISTS `TargetMethodConfig`;
CREATE TABLE `TargetMethodConfig`  (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `courseId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `targetId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `methodId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `weight` decimal(8, 4) NOT NULL DEFAULT 0.0000,
  `targetScore` decimal(8, 2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `TargetMethodConfig_targetId_methodId_key`(`targetId` ASC, `methodId` ASC) USING BTREE,
  INDEX `TargetMethodConfig_courseId_fkey`(`courseId` ASC) USING BTREE,
  INDEX `TargetMethodConfig_methodId_fkey`(`methodId` ASC) USING BTREE,
  CONSTRAINT `TargetMethodConfig_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TargetMethodConfig_methodId_fkey` FOREIGN KEY (`methodId`) REFERENCES `AssessmentMethod` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TargetMethodConfig_targetId_fkey` FOREIGN KEY (`targetId`) REFERENCES `CourseTarget` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;
