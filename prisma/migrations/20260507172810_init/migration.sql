-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "courseName" TEXT NOT NULL,
    "courseCode" TEXT NOT NULL,
    "courseType" TEXT,
    "semester" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "department" TEXT,
    "major" TEXT,
    "teacherNames" TEXT,
    "ownerTeacher" TEXT,
    "hours" TEXT,
    "credit" TEXT,
    "selectedCount" INTEGER NOT NULL DEFAULT 0,
    "evaluatedCount" INTEGER NOT NULL DEFAULT 0,
    "targetCount" INTEGER NOT NULL DEFAULT 7,
    "expectedValue" DECIMAL NOT NULL DEFAULT 0.65,
    "directWeight" DECIMAL NOT NULL DEFAULT 0.8,
    "indirectWeight" DECIMAL NOT NULL DEFAULT 0.2,
    "surveyWeight" DECIMAL NOT NULL DEFAULT 1,
    "analysisText" TEXT NOT NULL,
    "problemText" TEXT NOT NULL,
    "improvementText" TEXT NOT NULL,
    "teacherComment" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Course_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "apiKeyEncrypted" TEXT,
    "apiKeyType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CourseTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "graduationRequirement" TEXT NOT NULL,
    "supportStrength" TEXT,
    "overallWeight" DECIMAL NOT NULL DEFAULT 0,
    "processEvaluationRatio" DECIMAL NOT NULL DEFAULT 0,
    "resultEvaluationRatio" DECIMAL NOT NULL DEFAULT 0,
    "surveyEvaluationRatio" DECIMAL NOT NULL DEFAULT 1,
    "otherEvaluationRatio" DECIMAL NOT NULL DEFAULT 0,
    "directWeight" DECIMAL NOT NULL DEFAULT 0.8,
    "indirectWeight" DECIMAL NOT NULL DEFAULT 0.2,
    CONSTRAINT "CourseTarget_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssessmentMethod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fullScore" DECIMAL NOT NULL DEFAULT 100,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "AssessmentMethod_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TargetMethodConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,
    "weight" DECIMAL NOT NULL DEFAULT 0,
    "normalizedWeight" DECIMAL NOT NULL DEFAULT 0,
    "targetScore" DECIMAL NOT NULL DEFAULT 0,
    CONSTRAINT "TargetMethodConfig_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TargetMethodConfig_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "CourseTarget" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TargetMethodConfig_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "AssessmentMethod" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "majorName" TEXT,
    "className" TEXT,
    "studentNo" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    CONSTRAINT "Student_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExamQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "score" DECIMAL NOT NULL DEFAULT 0,
    "targetLabels" JSONB,
    "targetScores" JSONB NOT NULL,
    CONSTRAINT "ExamQuestion_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "score" DECIMAL,
    CONSTRAINT "StudentScore_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentScore_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentScore_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "AssessmentMethod" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentScore_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "CourseTarget" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IndirectEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "countA" INTEGER NOT NULL DEFAULT 0,
    "countB" INTEGER NOT NULL DEFAULT 0,
    "countC" INTEGER NOT NULL DEFAULT 0,
    "countD" INTEGER NOT NULL DEFAULT 0,
    "countE" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "IndirectEvaluation_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IndirectEvaluation_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "CourseTarget" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Course_userId_courseName_semester_className_key" ON "Course"("userId", "courseName", "semester", "className");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CourseTarget_courseId_sortOrder_key" ON "CourseTarget"("courseId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentMethod_courseId_sortOrder_key" ON "AssessmentMethod"("courseId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TargetMethodConfig_targetId_methodId_key" ON "TargetMethodConfig"("targetId", "methodId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_courseId_studentNo_key" ON "Student"("courseId", "studentNo");

-- CreateIndex
CREATE UNIQUE INDEX "ExamQuestion_courseId_sortOrder_key" ON "ExamQuestion"("courseId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "StudentScore_studentId_methodId_targetId_key" ON "StudentScore"("studentId", "methodId", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "IndirectEvaluation_targetId_key" ON "IndirectEvaluation"("targetId");
