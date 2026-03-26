import { exportWorkbook } from './course-export.ts';
import fs from 'node:fs';
import path from 'node:path';

const course = {
  courseName: '调试课程',
  courseCode: 'TEST001',
  courseType: '测试',
  semester: '2025-2026-1',
  className: '测试班',
  department: '测试学院',
  major: '测试专业',
  teacherNames: '测试教师',
  ownerTeacher: '测试责任人',
  hours: '32',
  credit: '2',
  selectedCount: 2,
  evaluatedCount: 2,
  expectedValue: 0.65,
  directWeight: 0.8,
  indirectWeight: 0.2,
  surveyWeight: 1,
  targets: [
    { name: '课程目标1', summary: '目标1说明', graduationRequirement: '指标1', supportStrength: 'H', overallWeight: 0.25, processEvaluationRatio: 0.4, resultEvaluationRatio: 0.4, surveyEvaluationRatio: 0.2, otherEvaluationRatio: 0, directWeight: 0.8, indirectWeight: 0.2 },
    { name: '课程目标2', summary: '目标2说明', graduationRequirement: '指标2', supportStrength: 'M', overallWeight: 0.25, processEvaluationRatio: 0.4, resultEvaluationRatio: 0.4, surveyEvaluationRatio: 0.2, otherEvaluationRatio: 0, directWeight: 0.8, indirectWeight: 0.2 },
    { name: '课程目标3', summary: '目标3说明', graduationRequirement: '指标3', supportStrength: 'L', overallWeight: 0.25, processEvaluationRatio: 0, resultEvaluationRatio: 0.8, surveyEvaluationRatio: 0.2, otherEvaluationRatio: 0, directWeight: 0.8, indirectWeight: 0.2 },
    { name: '课程目标4', summary: '目标4说明', graduationRequirement: '指标4', supportStrength: 'H', overallWeight: 0.25, processEvaluationRatio: 0, resultEvaluationRatio: 0.8, surveyEvaluationRatio: 0.2, otherEvaluationRatio: 0, directWeight: 0.8, indirectWeight: 0.2 },
    { name: '课程目标5', summary: '', graduationRequirement: '', supportStrength: '', overallWeight: 0, processEvaluationRatio: 0, resultEvaluationRatio: 0, surveyEvaluationRatio: 0.2, otherEvaluationRatio: 0, directWeight: 0.8, indirectWeight: 0.2 },
    { name: '课程目标6', summary: '', graduationRequirement: '', supportStrength: '', overallWeight: 0, processEvaluationRatio: 0, resultEvaluationRatio: 0, surveyEvaluationRatio: 0, otherEvaluationRatio: 0, directWeight: 0.8, indirectWeight: 0.2 },
    { name: '课程目标7', summary: '', graduationRequirement: '', supportStrength: '', overallWeight: 0, processEvaluationRatio: 0, resultEvaluationRatio: 0, surveyEvaluationRatio: 0, otherEvaluationRatio: 0, directWeight: 0.8, indirectWeight: 0.2 },
  ],
  methods: [
    { name: '平时作业', category: 'PROCESS', fullScore: 100, enabled: true },
    { name: '实验考核', category: 'PROCESS', fullScore: 100, enabled: true },
    { name: '结果性评价', category: 'RESULT', fullScore: 100, enabled: true },
  ],
  targetMethodConfigs: [
    { targetIndex: 0, methodIndex: 0, weight: 0.4, targetScore: 40 },
    { targetIndex: 0, methodIndex: 1, weight: 0, targetScore: 0 },
    { targetIndex: 0, methodIndex: 2, weight: 0, targetScore: 10 },
    { targetIndex: 1, methodIndex: 0, weight: 0.4, targetScore: 40 },
    { targetIndex: 1, methodIndex: 1, weight: 0, targetScore: 0 },
    { targetIndex: 1, methodIndex: 2, weight: 0, targetScore: 10 },
    { targetIndex: 2, methodIndex: 0, weight: 0, targetScore: 0 },
    { targetIndex: 2, methodIndex: 1, weight: 0, targetScore: 0 },
    { targetIndex: 2, methodIndex: 2, weight: 0, targetScore: 0 },
    { targetIndex: 3, methodIndex: 0, weight: 0, targetScore: 0 },
    { targetIndex: 3, methodIndex: 1, weight: 0.8, targetScore: 100 },
    { targetIndex: 3, methodIndex: 2, weight: 0, targetScore: 0 },
    { targetIndex: 4, methodIndex: 0, weight: 0, targetScore: 0 },
    { targetIndex: 4, methodIndex: 1, weight: 0, targetScore: 0 },
    { targetIndex: 4, methodIndex: 2, weight: 0, targetScore: 0 },
    { targetIndex: 5, methodIndex: 0, weight: 0, targetScore: 0 },
    { targetIndex: 5, methodIndex: 1, weight: 0, targetScore: 0 },
    { targetIndex: 5, methodIndex: 2, weight: 0, targetScore: 0 },
    { targetIndex: 6, methodIndex: 0, weight: 0, targetScore: 0 },
    { targetIndex: 6, methodIndex: 1, weight: 0, targetScore: 0 },
    { targetIndex: 6, methodIndex: 2, weight: 0, targetScore: 0 },
  ],
  examQuestions: [
    { label: '1', title: '题1', score: 10, targetLabels: ['1', '', '', '', '', '', ''], targetScores: [10, 0, 0, 0, 0, 0, 0] },
    { label: '2', title: '题2', score: 10, targetLabels: ['', '2', '', '', '', '', ''], targetScores: [0, 10, 0, 0, 0, 0, 0] },
  ],
  students: [
    { majorName: '', className: '', studentNo: 'S001', studentName: '甲', scores: { '0': {'0': 30, '1': 30, '2': null, '3': null, '4': null, '5': null, '6': null}, '1': {'0': null, '1': null, '2': null, '3': 80, '4': null, '5': null, '6': null}, '2': {'0': 8, '1': 7, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0} } },
    { majorName: '', className: '', studentNo: 'S002', studentName: '乙', scores: { '0': {'0': 20, '1': 35, '2': null, '3': null, '4': null, '5': null, '6': null}, '1': {'0': null, '1': null, '2': null, '3': 70, '4': null, '5': null, '6': null}, '2': {'0': 6, '1': 9, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0} } },
  ],
  indirectEvaluations: Array.from({ length: 7 }, (_, i) => ({ targetIndex: i, countA: i < 4 ? 5 : 0, countB: 0, countC: 0, countD: 0, countE: 0 })),
  reportTexts: { analysisText: '分析', problemText: '问题', improvementText: '改进', teacherComment: '评价' },
};

const buffer = await exportWorkbook(course, '3');
const out = path.join(process.cwd(), 'debug-export-3.xlsx');
fs.writeFileSync(out, buffer);
console.log(out, fs.statSync(out).size);
