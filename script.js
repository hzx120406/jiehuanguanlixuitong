// 设备借用管理系统 JavaScript

class DeviceManagementSystem {
    constructor() {
        this.records = this.loadRecords();
        this.currentPage = 'borrow';
        this.currentImages = [];
        this.currentImageIndex = 0;
        this.init();
    }

    // 初始化系统
    init() {
        this.setupEventListeners();
        this.setDefaultDates();
        this.renderRecords();
    }

    // 设置事件监听器
    setupEventListeners() {
        // 导航按钮
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                this.switchPage(page);
            });
        });

        // 借用表单
        document.getElementById('borrow-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleBorrowSubmit();
        });

        // 归还表单
        document.getElementById('return-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleReturnSubmit();
        });

        // 搜索功能
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.filterRecords();
        });

        // 状态筛选
        document.getElementById('status-filter').addEventListener('change', (e) => {
            this.filterRecords();
        });

        // 导出功能
        document.getElementById('export-btn').addEventListener('click', (e) => {
            this.exportRecords();
        });

        // 添加导出按钮的右键菜单选项
        document.getElementById('export-btn').addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showExportMenu(e);
        });

        // 图片上传功能
        document.getElementById('borrow-images').addEventListener('change', (e) => {
            this.handleImageUpload(e, 'borrow-image-preview');
        });

        document.getElementById('return-images').addEventListener('change', (e) => {
            this.handleImageUpload(e, 'return-image-preview');
        });

        // 键盘事件监听
        document.addEventListener('keydown', (e) => {
            const imageViewer = document.getElementById('image-viewer-modal');
            if (imageViewer.style.display === 'block') {
                if (e.key === 'Escape') {
                    this.closeImageViewer();
                } else if (e.key === 'ArrowLeft') {
                    this.previousImage();
                } else if (e.key === 'ArrowRight') {
                    this.nextImage();
                }
            }
        });

        // 点击模态框背景关闭图片查看器
        document.getElementById('image-viewer-modal').addEventListener('click', (e) => {
            if (e.target.id === 'image-viewer-modal') {
                this.closeImageViewer();
            }
        });
    }

    // 设置默认日期
    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        document.getElementById('borrow-date').value = today;
        document.getElementById('expected-return').value = nextWeek;
        document.getElementById('return-date').value = today;
    }

    // 切换页面
    switchPage(page) {
        // 更新导航按钮状态
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`).classList.add('active');

        // 切换页面内容
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });
        document.getElementById(`${page}-page`).classList.add('active');

        this.currentPage = page;

        // 如果切换到记录页面，刷新记录显示
        if (page === 'records') {
            this.renderRecords();
        }
    }

    // 处理借用表单提交
    handleBorrowSubmit() {
        const formData = new FormData(document.getElementById('borrow-form'));
        const borrowImages = this.getImagesFromPreview('borrow-image-preview');
        
        const borrowData = {
            id: this.generateId(),
            borrowerName: formData.get('borrowerName'),
            borrowerId: formData.get('borrowerId'),
            borrowerPhone: formData.get('borrowerPhone'),
            borrowerDepartment: formData.get('borrowerDepartment'),
            deviceName: formData.get('deviceName'),
            deviceModel: formData.get('deviceModel'),
            deviceSerial: formData.get('deviceSerial'),
            borrowPurpose: formData.get('borrowPurpose'),
            borrowDate: formData.get('borrowDate'),
            expectedReturn: formData.get('expectedReturn'),
            borrowImages: borrowImages,
            returnDate: null,
            deviceCondition: null,
            returnNotes: null,
            returnImages: null,
            status: 'borrowed',
            createdAt: new Date().toISOString()
        };

        this.records.push(borrowData);
        this.saveRecords();
        this.showSuccessModal('设备借用申请已提交成功！');
        document.getElementById('borrow-form').reset();
        this.clearImagePreview('borrow-image-preview');
        this.setDefaultDates();
    }

    // 处理归还表单提交
    handleReturnSubmit() {
        const formData = new FormData(document.getElementById('return-form'));
        const borrowerId = formData.get('borrowerId');
        const deviceName = formData.get('deviceName');
        const returnImages = this.getImagesFromPreview('return-image-preview');

        // 查找对应的借用记录
        const recordIndex = this.records.findIndex(record => 
            record.borrowerId === borrowerId && 
            record.deviceName === deviceName && 
            record.status === 'borrowed'
        );

        if (recordIndex === -1) {
            alert('未找到对应的借用记录，请检查学号和设备名称是否正确。');
            return;
        }

        // 更新记录
        this.records[recordIndex].returnDate = formData.get('returnDate');
        this.records[recordIndex].deviceCondition = formData.get('deviceCondition');
        this.records[recordIndex].returnNotes = formData.get('returnNotes');
        this.records[recordIndex].returnImages = returnImages;
        this.records[recordIndex].status = 'returned';
        this.records[recordIndex].updatedAt = new Date().toISOString();

        this.saveRecords();
        this.showSuccessModal('设备归还登记成功！');
        document.getElementById('return-form').reset();
        this.clearImagePreview('return-image-preview');
        this.setDefaultDates();
    }

    // 渲染记录表格
    renderRecords() {
        const tbody = document.getElementById('records-tbody');
        const noRecords = document.getElementById('no-records');
        
        if (this.records.length === 0) {
            tbody.innerHTML = '';
            noRecords.style.display = 'block';
            return;
        }

        noRecords.style.display = 'none';
        
        const filteredRecords = this.getFilteredRecords();
        
        tbody.innerHTML = filteredRecords.map(record => `
            <tr>
                <td>${record.borrowerName}</td>
                <td>${record.borrowerId}</td>
                <td>${record.deviceName}</td>
                <td>${this.formatDate(record.borrowDate)}</td>
                <td>${this.formatDate(record.expectedReturn)}</td>
                <td>${record.returnDate ? this.formatDate(record.returnDate) : '-'}</td>
                <td>
                    <span class="status-badge status-${record.status}">
                        ${record.status === 'borrowed' ? '已借用' : '已归还'}
                    </span>
                </td>
                <td>
                    <div class="record-images">
                        ${this.renderRecordImages(record)}
                    </div>
                </td>
                <td>
                    <button class="action-btn edit" onclick="deviceSystem.editRecord('${record.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deviceSystem.deleteRecord('${record.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // 获取筛选后的记录
    getFilteredRecords() {
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        const statusFilter = document.getElementById('status-filter').value;

        return this.records.filter(record => {
            const matchesSearch = !searchTerm || 
                record.borrowerName.toLowerCase().includes(searchTerm) ||
                record.borrowerId.toLowerCase().includes(searchTerm) ||
                record.deviceName.toLowerCase().includes(searchTerm);
            
            const matchesStatus = !statusFilter || record.status === statusFilter;
            
            return matchesSearch && matchesStatus;
        });
    }

    // 筛选记录
    filterRecords() {
        this.renderRecords();
    }

    // 编辑记录
    editRecord(id) {
        const record = this.records.find(r => r.id === id);
        if (!record) return;

        if (record.status === 'borrowed') {
            // 切换到借用页面并填充表单
            this.switchPage('borrow');
            this.fillBorrowForm(record);
        } else {
            // 切换到归还页面并填充表单
            this.switchPage('return');
            this.fillReturnForm(record);
        }
    }

    // 填充借用表单
    fillBorrowForm(record) {
        document.getElementById('borrower-name').value = record.borrowerName;
        document.getElementById('borrower-id').value = record.borrowerId;
        document.getElementById('borrower-phone').value = record.borrowerPhone;
        document.getElementById('borrower-department').value = record.borrowerDepartment || '';
        document.getElementById('device-name').value = record.deviceName;
        document.getElementById('device-model').value = record.deviceModel || '';
        document.getElementById('device-serial').value = record.deviceSerial || '';
        document.getElementById('borrow-purpose').value = record.borrowPurpose;
        document.getElementById('borrow-date').value = record.borrowDate;
        document.getElementById('expected-return').value = record.expectedReturn;
        
        // 填充图片预览
        this.clearImagePreview('borrow-image-preview');
        if (record.borrowImages) {
            record.borrowImages.forEach(imageSrc => {
                this.addImagePreview(imageSrc, document.getElementById('borrow-image-preview'));
            });
        }
    }

    // 填充归还表单
    fillReturnForm(record) {
        document.getElementById('return-borrower-id').value = record.borrowerId;
        document.getElementById('return-device-name').value = record.deviceName;
        document.getElementById('return-date').value = record.returnDate || new Date().toISOString().split('T')[0];
        document.getElementById('device-condition').value = record.deviceCondition || '';
        document.getElementById('return-notes').value = record.returnNotes || '';
        
        // 填充图片预览
        this.clearImagePreview('return-image-preview');
        if (record.returnImages) {
            record.returnImages.forEach(imageSrc => {
                this.addImagePreview(imageSrc, document.getElementById('return-image-preview'));
            });
        }
    }

    // 删除记录
    deleteRecord(id) {
        if (confirm('确定要删除这条记录吗？此操作不可恢复。')) {
            this.records = this.records.filter(record => record.id !== id);
            this.saveRecords();
            this.renderRecords();
            this.showSuccessModal('记录已删除！');
        }
    }

    // 导出记录
    exportRecords() {
        const filteredRecords = this.getFilteredRecords();
        const csvContent = this.generateCSV(filteredRecords);
        this.downloadCSV(csvContent, '双创基地设备借还记录.csv');
    }

    // 显示导出菜单
    showExportMenu(event) {
        const menu = document.createElement('div');
        menu.className = 'export-menu';
        menu.style.cssText = `
            position: fixed;
            top: ${event.pageY}px;
            left: ${event.pageX}px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            min-width: 200px;
        `;
        
        menu.innerHTML = `
            <div class="menu-item" onclick="deviceSystem.exportRecords()">
                <i class="fas fa-file-csv"></i> 导出CSV（含图片信息）
            </div>
            <div class="menu-item" onclick="deviceSystem.exportWithImages()">
                <i class="fas fa-images"></i> 导出详细数据（含图片）
            </div>
            <div class="menu-item" onclick="deviceSystem.exportImagesOnly()">
                <i class="fas fa-download"></i> 导出图片包
            </div>
        `;
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .export-menu .menu-item {
                padding: 12px 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                border-bottom: 1px solid #eee;
                transition: background 0.2s;
            }
            .export-menu .menu-item:hover {
                background: #f5f5f5;
            }
            .export-menu .menu-item:last-child {
                border-bottom: none;
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(menu);
        
        // 点击其他地方关闭菜单
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                document.body.removeChild(menu);
                document.head.removeChild(style);
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 100);
    }

    // 导出包含图片的详细数据
    exportWithImages() {
        const filteredRecords = this.getFilteredRecords();
        const jsonData = this.generateDetailedJSON(filteredRecords);
        this.downloadJSON(jsonData, '双创基地设备详细记录.json');
    }

    // 导出图片包
    exportImagesOnly() {
        const filteredRecords = this.getFilteredRecords();
        this.downloadImages(filteredRecords);
    }

    // 生成CSV内容
    generateCSV(records) {
        const headers = [
            '借用人姓名', '学号', '联系电话', '部门/班级', 
            '设备名称', '设备型号', '设备编号', '借用用途',
            '借用日期', '预计归还', '实际归还', '设备状态', '归还备注', 
            '借用图片数量', '归还图片数量', '图片信息', '记录状态'
        ];
        
        const rows = records.map(record => {
            const borrowImageCount = record.borrowImages ? record.borrowImages.length : 0;
            const returnImageCount = record.returnImages ? record.returnImages.length : 0;
            const totalImageCount = borrowImageCount + returnImageCount;
            
            // 生成图片信息摘要
            let imageInfo = '';
            if (totalImageCount > 0) {
                const imageDetails = [];
                if (borrowImageCount > 0) {
                    imageDetails.push(`借用时${borrowImageCount}张`);
                }
                if (returnImageCount > 0) {
                    imageDetails.push(`归还时${returnImageCount}张`);
                }
                imageInfo = imageDetails.join('，');
            } else {
                imageInfo = '无图片';
            }
            
            return [
                record.borrowerName,
                record.borrowerId,
                record.borrowerPhone,
                record.borrowerDepartment || '',
                record.deviceName,
                record.deviceModel || '',
                record.deviceSerial || '',
                record.borrowPurpose,
                record.borrowDate,
                record.expectedReturn,
                record.returnDate || '',
                record.deviceCondition || '',
                record.returnNotes || '',
                borrowImageCount,
                returnImageCount,
                imageInfo,
                record.status === 'borrowed' ? '已借用' : '已归还'
            ];
        });
        
        return [headers, ...rows].map(row => 
            row.map(field => `"${field}"`).join(',')
        ).join('\n');
    }

    // 下载CSV文件
    downloadCSV(csvContent, filename) {
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // 生成详细JSON数据
    generateDetailedJSON(records) {
        return {
            exportInfo: {
                exportTime: new Date().toISOString(),
                totalRecords: records.length,
                systemName: '双创基地设备管理系统'
            },
            records: records.map(record => ({
                id: record.id,
                borrowerInfo: {
                    name: record.borrowerName,
                    studentId: record.borrowerId,
                    phone: record.borrowerPhone,
                    department: record.borrowerDepartment
                },
                deviceInfo: {
                    name: record.deviceName,
                    model: record.deviceModel,
                    serialNumber: record.deviceSerial
                },
                borrowInfo: {
                    purpose: record.borrowPurpose,
                    borrowDate: record.borrowDate,
                    expectedReturn: record.expectedReturn,
                    actualReturn: record.returnDate,
                    images: record.borrowImages || []
                },
                returnInfo: {
                    condition: record.deviceCondition,
                    notes: record.returnNotes,
                    images: record.returnImages || []
                },
                status: record.status,
                timestamps: {
                    createdAt: record.createdAt,
                    updatedAt: record.updatedAt
                }
            }))
        };
    }

    // 下载JSON文件
    downloadJSON(jsonData, filename) {
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // 下载图片包
    downloadImages(records) {
        const imagesToDownload = [];
        
        records.forEach(record => {
            if (record.borrowImages && record.borrowImages.length > 0) {
                record.borrowImages.forEach((imageSrc, index) => {
                    imagesToDownload.push({
                        name: `${record.borrowerName}_${record.deviceName}_借用_${index + 1}.png`,
                        data: imageSrc
                    });
                });
            }
            
            if (record.returnImages && record.returnImages.length > 0) {
                record.returnImages.forEach((imageSrc, index) => {
                    imagesToDownload.push({
                        name: `${record.borrowerName}_${record.deviceName}_归还_${index + 1}.png`,
                        data: imageSrc
                    });
                });
            }
        });

        if (imagesToDownload.length === 0) {
            alert('没有找到图片数据');
            return;
        }

        // 创建ZIP文件（简化版本，直接下载单个图片）
        if (imagesToDownload.length === 1) {
            this.downloadSingleImage(imagesToDownload[0]);
        } else {
            // 如果有多个图片，提示用户
            const confirmDownload = confirm(`找到 ${imagesToDownload.length} 张图片，是否逐一下载？\n\n注意：由于浏览器限制，多图片将分别下载。`);
            if (confirmDownload) {
                imagesToDownload.forEach((image, index) => {
                    setTimeout(() => {
                        this.downloadSingleImage(image);
                    }, index * 500); // 延迟下载避免浏览器阻止
                });
            }
        }
    }

    // 下载单个图片
    downloadSingleImage(imageInfo) {
        const link = document.createElement('a');
        link.href = imageInfo.data;
        link.download = imageInfo.name;
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // 显示成功模态框
    showSuccessModal(message) {
        document.getElementById('success-message').textContent = message;
        document.getElementById('success-modal').style.display = 'block';
    }

    // 关闭模态框
    closeModal() {
        document.getElementById('success-modal').style.display = 'none';
    }

    // 生成唯一ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // 格式化日期
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN');
    }

    // 保存记录到本地存储
    saveRecords() {
        localStorage.setItem('deviceRecords', JSON.stringify(this.records));
    }

    // 从本地存储加载记录
    loadRecords() {
        const records = localStorage.getItem('deviceRecords');
        return records ? JSON.parse(records) : [];
    }

    // 处理图片上传
    handleImageUpload(event, previewContainerId) {
        const files = Array.from(event.target.files);
        const previewContainer = document.getElementById(previewContainerId);
        
        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.addImagePreview(e.target.result, previewContainer);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // 添加图片预览
    addImagePreview(imageSrc, container) {
        const imageItem = document.createElement('div');
        imageItem.className = 'image-preview-item';
        imageItem.innerHTML = `
            <img src="${imageSrc}" alt="预览图片">
            <button class="remove-btn" onclick="deviceSystem.removeImagePreview(this)">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(imageItem);
    }

    // 移除图片预览
    removeImagePreview(button) {
        button.parentElement.remove();
    }

    // 清空图片预览
    clearImagePreview(containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
    }

    // 从预览容器获取图片数据
    getImagesFromPreview(containerId) {
        const container = document.getElementById(containerId);
        const images = [];
        const imageItems = container.querySelectorAll('.image-preview-item img');
        imageItems.forEach(img => {
            images.push(img.src);
        });
        return images;
    }

    // 渲染记录中的图片
    renderRecordImages(record) {
        const allImages = [];
        if (record.borrowImages) {
            allImages.push(...record.borrowImages);
        }
        if (record.returnImages) {
            allImages.push(...record.returnImages);
        }

        if (allImages.length === 0) {
            return '<span style="color: #999;">无图片</span>';
        }

        // 添加调试信息
        console.log('渲染图片记录:', {
            recordId: record.id,
            borrowerName: record.borrowerName,
            borrowImages: record.borrowImages ? record.borrowImages.length : 0,
            returnImages: record.returnImages ? record.returnImages.length : 0,
            totalImages: allImages.length
        });

        return allImages.map((imageSrc, index) => `
            <img src="${imageSrc}" 
                 class="record-image-thumb" 
                 alt="设备图片" 
                 data-images='${JSON.stringify(allImages)}'
                 data-index="${index}"
                 onclick="deviceSystem.openImageViewerFromThumb(this)">
        `).join('');
    }

    // 从缩略图打开图片查看器
    openImageViewerFromThumb(thumbElement) {
        try {
            const images = JSON.parse(thumbElement.dataset.images);
            const startIndex = parseInt(thumbElement.dataset.index);
            
            if (!images || images.length === 0) {
                console.warn('没有找到图片数据');
                return;
            }
            
            this.openImageViewer(images, startIndex);
        } catch (error) {
            console.error('解析图片数据失败:', error);
            alert('图片数据解析失败，请刷新页面重试');
        }
    }

    // 打开图片查看器
    openImageViewer(images, startIndex = 0) {
        this.currentImages = images;
        this.currentImageIndex = startIndex;
        
        const modal = document.getElementById('image-viewer-modal');
        const viewerImage = document.getElementById('viewer-image');
        const counter = document.getElementById('image-counter');
        
        // 确保索引在有效范围内
        if (startIndex < 0 || startIndex >= images.length) {
            this.currentImageIndex = 0;
        }
        
        this.updateImageViewer();
        modal.style.display = 'block';
        
        // 添加调试信息
        console.log('打开图片查看器:', {
            images: images.length,
            currentIndex: this.currentImageIndex,
            currentImage: images[this.currentImageIndex]
        });
    }

    // 更新图片查看器
    updateImageViewer() {
        const viewerImage = document.getElementById('viewer-image');
        const counter = document.getElementById('image-counter');
        
        if (this.currentImages && this.currentImages.length > 0) {
            // 添加加载状态
            viewerImage.style.opacity = '0.5';
            viewerImage.onload = () => {
                viewerImage.style.opacity = '1';
            };
            viewerImage.onerror = () => {
                viewerImage.style.opacity = '1';
                console.error('图片加载失败:', this.currentImages[this.currentImageIndex]);
            };
            
            viewerImage.src = this.currentImages[this.currentImageIndex];
            counter.textContent = `${this.currentImageIndex + 1} / ${this.currentImages.length}`;
        }
    }

    // 上一张图片
    previousImage() {
        if (this.currentImages.length > 0) {
            this.currentImageIndex = (this.currentImageIndex - 1 + this.currentImages.length) % this.currentImages.length;
            this.updateImageViewer();
        }
    }

    // 下一张图片
    nextImage() {
        if (this.currentImages.length > 0) {
            this.currentImageIndex = (this.currentImageIndex + 1) % this.currentImages.length;
            this.updateImageViewer();
        }
    }

    // 关闭图片查看器
    closeImageViewer() {
        document.getElementById('image-viewer-modal').style.display = 'none';
        this.currentImages = [];
        this.currentImageIndex = 0;
    }
}

// 全局函数
function closeModal() {
    deviceSystem.closeModal();
}

function closeImageViewer() {
    deviceSystem.closeImageViewer();
}

function previousImage() {
    deviceSystem.previousImage();
}

function nextImage() {
    deviceSystem.nextImage();
}

// 初始化系统
const deviceSystem = new DeviceManagementSystem();
