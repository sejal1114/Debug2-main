import PDFDocument from 'pdfkit';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only POST requests are supported',
      allowed_methods: ['POST']
    });
  }

  const { analysisData } = req.body;

  if (!analysisData) {
    return res.status(400).json({
      error: 'Missing required field',
      message: 'Analysis data is required',
      required_fields: ['analysisData']
    });
  }

  try {
    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `GitHub Repository Analysis - ${analysisData.summary?.repository || 'Unknown'}`,
        Author: 'AI Code Analyzer',
        Subject: 'Code Analysis Report',
        Keywords: 'code analysis, bugs, issues, github',
        Creator: 'AI Code Analyzer',
        Producer: 'AI Code Analyzer'
      }
    });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="github-analysis-${analysisData.summary?.repository?.replace('/', '-') || 'report'}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add content to PDF
    generatePDFContent(doc, analysisData);

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('PDF generation error:', error);
    return res.status(500).json({
      error: 'PDF generation failed',
      message: 'Failed to generate PDF report. Please try again.',
      details: error.message
    });
  }
}

function generatePDFContent(doc, analysisData) {
  const { summary, files, metadata } = analysisData;

  // Title Page
  doc.fontSize(24)
     .font('Helvetica-Bold')
     .text('GitHub Repository Analysis Report', { align: 'center' })
     .moveDown(0.5);

  doc.fontSize(16)
     .font('Helvetica')
     .text(`Repository: ${summary.repository}`, { align: 'center' })
     .moveDown(0.5);

  doc.fontSize(12)
     .text(`Branch: ${summary.branch}`, { align: 'center' })
     .moveDown(0.5);

  doc.fontSize(10)
     .text(`Generated: ${new Date(metadata.timestamp).toLocaleString()}`, { align: 'center' })
     .moveDown(2);

  // Executive Summary
  doc.addPage();
  doc.fontSize(18)
     .font('Helvetica-Bold')
     .text('Executive Summary')
     .moveDown(1);

  // Summary Statistics
  const summaryStats = [
    { label: 'Total Files Analyzed', value: summary.total_files },
    { label: 'Files with Issues', value: summary.files_with_bugs },
    { label: 'Total Issues Found', value: summary.total_issues },
    { label: 'Risk Level', value: getRiskLevel(summary.total_issues, summary.files_with_bugs).toUpperCase() }
  ];

  summaryStats.forEach(stat => {
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text(`${stat.label}:`)
       .font('Helvetica')
       .text(`  ${stat.value}`, { indent: 20 })
       .moveDown(0.5);
  });

  doc.moveDown(1);

  // Risk Assessment
  const riskLevel = getRiskLevel(summary.total_issues, summary.files_with_bugs);
  const riskColor = getRiskColor(riskLevel);
  
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .text('Risk Assessment')
     .moveDown(0.5);

  doc.fontSize(12)
     .font('Helvetica')
     .text(`Overall Risk Level: ${riskLevel.toUpperCase()}`)
     .moveDown(0.5);

  const riskDescription = getRiskDescription(riskLevel);
  doc.text(riskDescription, { align: 'justify' })
     .moveDown(1);

  // Detailed Analysis
  doc.addPage();
  doc.fontSize(18)
     .font('Helvetica-Bold')
     .text('Detailed File Analysis')
     .moveDown(1);

  files.forEach((file, index) => {
    if (index > 0) {
      doc.addPage();
    }

    // File Header
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text(`📄 ${file.file}`)
       .moveDown(0.5);

    doc.fontSize(10)
       .font('Helvetica')
       .text(`Language: ${file.language}`)
       .moveDown(0.5);

    // File Status
    if (file.bugs_detected) {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('red')
         .text('🐛 Bugs Detected')
         .fillColor('black');
    }

    if (file.issues_count > 0) {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('orange')
         .text(`⚠️ ${file.issues_count} Issues Found`)
         .fillColor('black');
    }

    doc.moveDown(0.5);

    // Analysis Content
    if (file.analysis) {
      // Explanation
      if (file.analysis.explanation) {
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('Analysis:')
           .moveDown(0.5);

        doc.fontSize(10)
           .font('Helvetica')
           .text(file.analysis.explanation, { align: 'justify' })
           .moveDown(1);
      }

      // Issues
      if (file.analysis.issues && file.analysis.issues.length > 0) {
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('Issues Found:')
           .moveDown(0.5);

        file.analysis.issues.forEach((issue, issueIndex) => {
          doc.fontSize(10)
             .font('Helvetica')
             .text(`• ${issue}`, { indent: 20 })
             .moveDown(0.3);
        });

        doc.moveDown(1);
      }

      // Suggested Fix
      if (file.analysis.suggested_fix) {
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('Suggested Fix:')
           .moveDown(0.5);

        doc.fontSize(9)
           .font('Courier')
           .text(file.analysis.suggested_fix, { 
             indent: 20,
             align: 'left'
           })
           .moveDown(1);
      }
    }

    // Error handling
    if (file.error) {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('red')
         .text('Error:')
         .moveDown(0.5);

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('red')
         .text(file.error)
         .fillColor('black')
         .moveDown(1);
    }
  });

  // Recommendations Page
  doc.addPage();
  doc.fontSize(18)
     .font('Helvetica-Bold')
     .text('Recommendations')
     .moveDown(1);

  const recommendations = generateRecommendations(analysisData);
  recommendations.forEach((rec, index) => {
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text(`${index + 1}. ${rec.title}`)
       .moveDown(0.5);

    doc.fontSize(10)
       .font('Helvetica')
       .text(rec.description, { align: 'justify' })
       .moveDown(1);
  });

  // Footer
  doc.fontSize(8)
     .font('Helvetica')
     .text('Generated by AI Code Analyzer', { align: 'center' })
     .text(`Report ID: ${metadata.request_id}`, { align: 'center' });
}

function getRiskLevel(issuesCount, filesWithBugs) {
  if (filesWithBugs > 3 || issuesCount > 10) return 'high';
  if (filesWithBugs > 1 || issuesCount > 5) return 'medium';
  return 'low';
}

function getRiskColor(level) {
  switch (level) {
    case 'high': return 'red';
    case 'medium': return 'orange';
    case 'low': return 'green';
    default: return 'black';
  }
}

function getRiskDescription(level) {
  switch (level) {
    case 'high':
      return 'This repository has significant issues that require immediate attention. Multiple files contain bugs and there are numerous issues that could impact functionality, security, or performance.';
    case 'medium':
      return 'This repository has some issues that should be addressed. While not critical, there are bugs and issues that could cause problems in certain scenarios.';
    case 'low':
      return 'This repository is in good condition with minimal issues. The code quality is generally high with few bugs or problems detected.';
    default:
      return 'Risk level could not be determined.';
  }
}

function generateRecommendations(analysisData) {
  const { summary, files } = analysisData;
  const recommendations = [];

  // General recommendations based on summary
  if (summary.files_with_bugs > 0) {
    recommendations.push({
      title: 'Address Critical Bugs',
      description: `Found ${summary.files_with_bugs} files with bugs. Prioritize fixing these issues as they can cause runtime errors and unexpected behavior.`
    });
  }

  if (summary.total_issues > 5) {
    recommendations.push({
      title: 'Code Quality Review',
      description: `With ${summary.total_issues} total issues, consider implementing a code review process and automated testing to catch issues earlier.`
    });
  }

  // Language-specific recommendations
  const languages = [...new Set(files.map(f => f.language))];
  if (languages.includes('javascript') || languages.includes('typescript')) {
    recommendations.push({
      title: 'Implement ESLint',
      description: 'Consider adding ESLint configuration to catch common JavaScript/TypeScript issues automatically.'
    });
  }

  if (languages.includes('python')) {
    recommendations.push({
      title: 'Add Type Hints',
      description: 'Consider adding type hints to improve code maintainability and catch type-related issues.'
    });
  }

  // Performance recommendations
  const hasPerformanceIssues = files.some(f => 
    f.analysis?.issues?.some(issue => 
      issue.toLowerCase().includes('performance') || 
      issue.toLowerCase().includes('slow') ||
      issue.toLowerCase().includes('memory')
    )
  );

  if (hasPerformanceIssues) {
    recommendations.push({
      title: 'Performance Optimization',
      description: 'Performance issues detected. Consider profiling your code and optimizing bottlenecks.'
    });
  }

  // Security recommendations
  const hasSecurityIssues = files.some(f => 
    f.analysis?.issues?.some(issue => 
      issue.toLowerCase().includes('security') || 
      issue.toLowerCase().includes('vulnerability') ||
      issue.toLowerCase().includes('injection')
    )
  );

  if (hasSecurityIssues) {
    recommendations.push({
      title: 'Security Review',
      description: 'Security-related issues found. Conduct a thorough security review and implement proper input validation.'
    });
  }

  // Default recommendation if no specific issues
  if (recommendations.length === 0) {
    recommendations.push({
      title: 'Maintain Code Quality',
      description: 'Your code is in good condition. Continue following best practices and consider adding automated testing.'
    });
  }

  return recommendations;
} 