/**
 * 生成仓库结构数据的脚本
 * 这个脚本会扫描releases、plugins和snapshots目录，生成仓库结构的JSON数据
 * 然后保存到单独的JSON文件中
 */
const fs = require('fs');
const path = require('path');
// 仓库根目录
const REPO_ROOT = path.join(__dirname);
// 要处理的目录列表
const TARGET_DIRS = ['releases', 'plugins', 'snapshots'];
// 输出的JSON文件名
const OUTPUT_JSON_FILE = 'index-cache.json';
/**
 * 递归扫描目录，生成目录结构数据
 * @param {string} dirPath 要扫描的目录路径
 * @param {string} relativePath 相对于仓库根目录的路径
 * @returns {Array} 目录内容的数组
 */
function scanDirectory(dirPath, relativePath = '') {
	const result = [];
	if (!fs.existsSync(dirPath)) {
		console.warn(`Directory does not exist: ${dirPath}`);
		return result;
	}
	const items = fs.readdirSync(dirPath);
	for (const item of items) {
		const itemPath = path.join(dirPath, item);
		const stats = fs.statSync(itemPath);
		const isDirectory = stats.isDirectory();
		// 如果是根目录，只添加指定的目标目录
		if (relativePath === '' && !TARGET_DIRS.includes(item)) continue;
		// 目录的size为0，文件则为实际大小
		result.push({
			name: item, lastModified: stats.mtime.toISOString(), size: isDirectory ? 0 : stats.size
		});
	}
	return result;
}
/**
 * 生成整个仓库的结构数据
 * @returns {Object} 仓库结构数据
 */
function generateRepositoryStructure() {
	// 创建仓库结构对象
	const repoStructure = {};
	// 扫描根目录，只包含目标子目录
	repoStructure[''] = scanDirectory(REPO_ROOT);
	// 递归扫描子目录
	function scanSubdirectories(dirPath, relativePath) {
		if (!fs.existsSync(dirPath)) return;
		for (const item of fs.readdirSync(dirPath)) {
			// 跳过隐藏文件和特定文件
			if (item.startsWith('.')) continue;
			const itemPath = path.join(dirPath, item);
			const stats = fs.statSync(itemPath);
			if (!stats.isDirectory()) continue;
			const newRelativePath = relativePath ? `${relativePath}/${item}` : item;
			const shouldScan = TARGET_DIRS.some(targetDir => {
				return newRelativePath === targetDir || newRelativePath.startsWith(`${targetDir}/`);
			});
			if (!shouldScan) continue;
			repoStructure[newRelativePath] = scanDirectory(itemPath, newRelativePath);
			scanSubdirectories(itemPath, newRelativePath);
		}
	}
	// 开始递归扫描
	scanSubdirectories(REPO_ROOT, '');
	// 打印结构数据以便调试
	console.log(Object.keys(repoStructure));
	return repoStructure;
}
/**
 * 将仓库结构数据保存到JSON文件中
 * @param {Object} repoStructure 仓库结构数据
 */
function saveStructureToFile(repoStructure) {
	try {
		// 转换为JSON字符串
		const repoStructureJson = JSON.stringify(repoStructure, null, 2);
		const outputPath = path.join(__dirname, OUTPUT_JSON_FILE);
		// 写入到文件
		fs.writeFileSync(outputPath, repoStructureJson);
		console.log(`Repository structure data has been saved to ${outputPath}`);
	} catch (error) {
		console.error(`Error saving structure to file:`, error);
	}
}
// 执行生成过程
saveStructureToFile(generateRepositoryStructure());
console.log('Repository structure data generation completed!');
