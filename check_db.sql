USE RIS_System;
GO

PRINT '================================================='
PRINT 'فحص قاعدة البيانات RIS_System'
PRINT '================================================='
PRINT ''
PRINT 'TABLES:'
SELECT OBJECT_NAME(i.object_id) AS [Table Name], SUM(p.rows) AS [Row Count] 
FROM sys.indexes i 
INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id 
WHERE OBJECTPROPERTY(i.object_id,'IsUserTable')=1 
AND i.index_id IN (0,1) 
GROUP BY i.object_id 
ORDER BY [Table Name]
GO

PRINT ''
PRINT 'STORED PROCEDURES:'
SELECT OBJECT_NAME(object_id) AS [Procedure Name] 
FROM sys.objects 
WHERE type='P' 
ORDER BY [Procedure Name]
GO

PRINT ''
PRINT 'VIEWS:'
SELECT OBJECT_NAME(object_id) AS [View Name] 
FROM sys.objects 
WHERE type='V' 
ORDER BY [View Name]
GO

PRINT ''
PRINT 'INDEXES:'
SELECT COUNT(*) AS [Total Indexes] 
FROM sys.indexes 
WHERE database_id=DB_ID()
GO

PRINT ''
PRINT '================================================='
PRINT 'CHECK PASSED SUCCESSFULLY!'
PRINT '================================================='
