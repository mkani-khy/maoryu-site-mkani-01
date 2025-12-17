const json_file_name1 = 'battle_data.json';
const tableBody = document.getElementById('charaTableBody');
const filtersContainer = document.getElementById('filtersContainer'); 
const columnCheckboxesContainer = document.getElementById('columnCheckboxesContainer');
const columnToggleHeader = document.getElementById('columnToggleHeader');

let allCharacters = [];
let filterCount = 0;
// 初期状態: 折りたたみ
let isColumnsExpanded = false; 

// === 列の設定 (データ構造は変更なし) ===
const COLUMN_CONFIG = [
    { header: "画像", key: "画像リンク", show: true, type: "image", width: "60px" },
    { header: "称号", key: "称号", show: false, width: "150px" },
    { header: "キャラ名", key: "キャラ名", show: true, width: "150px" },
    { header: "属性", key: "属性", show: true, width: "60px" },
    { header: "初期レア", key: "初期レアリティ", show: false, width: "60px" },
    { header: "レア", key: "レアリティ", show: false, width: "60px" },
    { header: "レベル", key: "レベル", show: false, width: "60px" },
    { header: "物理/魔法", key: "物理or魔法", show: true, width: "90px" },
    { header: "戦略タイプ", key: "戦略タイプ", show: true, width: "90px" },
    { header: "極", key: "極み", show: false, width: "60px" },
    { header: "属性解放", key: "属性解放", show: false, width: "90px" },
    { header: "勢力", key: "勢力", show: true, width: "250px" },
    { header: "覚醒", key: "覚醒", show: false, width: "60px" },
    { header: "Uタイプ", key: "奥義タイプ", show: false, width: "100px" },
    { header: "Uレベル", key: "奥義レベル", show: false, width: "90px" },
    { header: "Uダメージ", key: "奥義ダメ", show: true, width: "180px" },
    { header: "U付属", key: "奥義付属", show: true, width: "250px" },
    { header: "U対象", key: "単体or全体", show: true, width: "90px" },
    { header: "S1系統", key: "スキル1系統", show: false, width: "90px" },
    { header: "S1レベル", key: "スキル1レベル", show: false, width: "90px" },
    { header: "S1概要", key: "スキル1概要", show: true, width: "300px" },
    { header: "S1詳細", key: "スキル1詳細", show: false, width: "350px" },
    { header: "S1コスト", key: "スキル1コスト", show: true, width: "90px" },
    { header: "S2系統", key: "スキル2系統", show: false, width: "90px" },
    { header: "S2レベル", key: "スキル2レベル", show: false, width: "90px" },
    { header: "S2概要", key: "スキル2概要", show: true, width: "300px" },
    { header: "S2詳細", key: "スキル2詳細", show: false, width: "350px" },
    { header: "S2コスト", key: "スキル2コスト", show: true, width: "90px" },
    { header: "特性", key: "特性", show: true, width: "150px" },
    { header: "英傑特性", key: "英傑特性", show: false, width: "150px" },
    { header: "U強化", key: "奥義強化", show: false, width: "90px" },
    { header: "入手方法", key: "入手方法", show: false, width: "120px" },
    { header: "備考", key: "備考", show: false, width: "150px" }
];

// 数値検索対象列（<= 比較として処理される）
const numericSearchColumns = [
    'レアリティ', 'レベル', '覚醒', '奥義レベル', 'スキル1レベル', 'スキル2レベル', 
    'スキル1コスト', 'スキル2コスト'
];

// フィルタオプション（元のHTMLのselectタグの内容に基づき作成）
const FILTER_OPTIONS_HTML = `
    <option value="__all__">全列</option>
    ${COLUMN_CONFIG.filter(col => col.key !== "画像リンク").map(col => `<option value="${col.key}">${col.header}</option>`).join('')}
    <option value="スキル1コスト or スキル2コスト">S1コスト/S2コスト</option>
`;


// === 列選択 UI 関連関数 ===

function toggleColumnCheckboxes() {
    if (!columnCheckboxesContainer) return;
    
    isColumnsExpanded = !isColumnsExpanded;
    columnCheckboxesContainer.style.display = isColumnsExpanded ? 'block' : 'none';
}

function setupColumnSelector() {
    const container = document.getElementById('columnCheckboxes');
    if (!container) return; 
    container.innerHTML = ''; 

    COLUMN_CONFIG.forEach((col, index) => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `col-${index}`;
        checkbox.checked = col.show;
        checkbox.value = index;
        checkbox.onchange = toggleColumnVisibility;

        const label = document.createElement('label');
        label.htmlFor = `col-${index}`;
        label.textContent = col.header;

        const div = document.createElement('div');
        div.appendChild(checkbox);
        div.appendChild(label);
        
        container.appendChild(div);
    });
}

function toggleColumnVisibility(event) {
    const index = event.target.value;
    COLUMN_CONFIG[index].show = event.target.checked;
    filterCharacters(); 
}

function checkAllColumns() {
    COLUMN_CONFIG.forEach(col => col.show = true);
    document.querySelectorAll('#columnCheckboxes input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = true;
    });
    filterCharacters();
}

function uncheckAllColumns() {
    COLUMN_CONFIG.forEach(col => col.show = false);
    document.querySelectorAll('#columnCheckboxes input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // 最低限の列を表示に戻す
    COLUMN_CONFIG[0].show = true; // 画像
    COLUMN_CONFIG[2].show = true; // キャラ名
    
    const col0 = document.getElementById('col-0');
    if (col0) col0.checked = true;
    const col2 = document.getElementById('col-2');
    if (col2) col2.checked = true;

    filterCharacters();
}


// === 絞り込み UI/ロジック 関連関数 ===

// フィルタ条件の行を追加する関数
function addFilterRow() {
    filterCount++;
    const filterId = filterCount;

    const filterDiv = document.createElement('div');
    filterDiv.classList.add('filterRow');
    filterDiv.dataset.filterId = filterId;

    filterDiv.innerHTML = `
        <label for="column_${filterId}">列:</label>
        <select id="column_${filterId}" class="filterColumn">
            ${FILTER_OPTIONS_HTML}
        </select>

        <label for="search_${filterId}">絞り込み:</label>
        <input type="text" id="search_${filterId}" class="filterSearch" placeholder="検索キーワードを入力" style="width: 150px;">
        <button type="button" class="remove-filter-btn" onclick="removeFilterRow(${filterId})">削除</button>
    `;

    if (filtersContainer) {
        filtersContainer.appendChild(filterDiv);
    } 
}

// フィルタ条件の行を削除する関数
function removeFilterRow(filterId) {
    const filterRow = document.querySelector(`.filterRow[data-filter-id="${filterId}"]`);
    if (filterRow) {
        filterRow.remove();
    }
}

// 1つのキャラクターが1つのフィルタ条件を満たすかチェックするヘルパー関数
function checkFilterCondition(chara, searchColumn, searchTerm) {
    // searchTermは呼び出し元でtrimされていることを前提とする
    searchTerm = searchTerm.toLowerCase();

    // 'スキル1コスト or スキル2コスト'のカスタム処理
    if (searchColumn === 'スキル1コスト or スキル2コスト') {
        // 数値検索 (<= 比較)
        const searchNumber = parseFloat(searchTerm);
        if (!isNaN(searchNumber)) {
            const charaS1Cost = parseInt(chara['スキル1コスト'] ?? NaN);
            const charaS2Cost = parseInt(chara['スキル2コスト'] ?? NaN);
            const isS1Match = !isNaN(charaS1Cost) && charaS1Cost <= searchNumber;
            const isS2Match = !isNaN(charaS2Cost) && charaS2Cost <= searchNumber;
            return isS1Match || isS2Match;
        }
        // 文字列検索 (部分一致)
        const S1_text = String(chara['スキル1コスト'] ?? '').toLowerCase();
        const S2_text = String(chara['スキル2コスト'] ?? '').toLowerCase();
        return S1_text.includes(searchTerm) || S2_text.includes(searchTerm);
    }
    // 数値検索対象列の処理 (<= 比較)
    else if (numericSearchColumns.includes(searchColumn)) {
        const searchNumber = parseFloat(searchTerm);
        if (!isNaN(searchNumber)){
            const charaValue = parseInt(chara[searchColumn] ?? NaN);
            // 値が数値で、かつ検索値以下であればマッチ
            return !isNaN(charaValue) && charaValue <= searchNumber;
        }
        // 数値ではない文字列が入力された場合は、通常の文字列検索として扱う
        const value = chara[searchColumn];
        const textValue = String(value ?? '').toLowerCase();
        return textValue.includes(searchTerm);
    }
    // 全列検索の処理
    else if (searchColumn === '__all__'){
        return Object.values(chara).some(value => {
            const textValue = String(value ?? '').toLowerCase();
            return textValue.includes(searchTerm);
        });
    }
    // その他（通常の文字列検索）
    else{
        const value = chara[searchColumn];
        const textValue = String(value ?? '').toLowerCase();
        return textValue.includes(searchTerm);
    }
}

function filterCharacters() {
    const filterRows = document.querySelectorAll('#filtersContainer .filterRow');
    const filters = [];
    
    filterRows.forEach(row => {
        const columnSelect = row.querySelector('.filterColumn');
        const searchInput = row.querySelector('.filterSearch');
        
        if (columnSelect && searchInput) {
            const searchColumn = columnSelect.value;
            const searchTerm = searchInput.value.trim();
            
            if (searchTerm) {
                filters.push({ searchColumn, searchTerm });
            }
        }
    });

    if (filters.length === 0) {
        renderTable(allCharacters);
        return;
    }

    const filteredCharacters = allCharacters.filter(chara => {
        // すべての条件をANDでチェック
        return filters.every(filter => {
            return checkFilterCondition(chara, filter.searchColumn, filter.searchTerm);
        });
    });

    renderTable(filteredCharacters);
}

// === データ処理/描画関数 ===

async function loadData() {
    try{
        const response = await fetch(json_file_name1);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allCharacters = await response.json();
        console.log("データの読み込み成功");
        
        if (!Array.isArray(allCharacters)) {
            throw new Error("JSONデータが配列形式ではありません。");
        }

        setupColumnSelector(); // 列選択 UIを生成
        renderTable(allCharacters);
        
        // ページロード後の初期化処理
        if (columnToggleHeader) {
            columnToggleHeader.addEventListener('click', toggleColumnCheckboxes);
        }
        if (columnCheckboxesContainer) {
            // 初期状態で折りたたむ
            columnCheckboxesContainer.style.display = 'none'; 
        }
        
        // ページロード時に最初のフィルタ条件行を追加
        addFilterRow(); 

    } catch(error){
        console.log("データの読み込み失敗", error);
        if(tableBody) {
            tableBody.innerHTML = `<tr><td colspan="${COLUMN_CONFIG.length}">データの読み込み失敗: ${error.message} (JSONファイルを確認してください)</td></tr>`;
        }
    }
}

function renderTable(characters){
    tableBody.innerHTML = '';
    const visibleColumns = COLUMN_CONFIG.filter(col => col.show);

    // 1. ヘッダーを動的に作成
    const table = document.getElementById('charaTable');
    let tableHead = table.querySelector('thead');
    if (!tableHead) {
        tableHead = table.createTHead();
    }
    tableHead.innerHTML = ''; 

    const headerRow = tableHead.insertRow();
    
    visibleColumns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.header;
        th.setAttribute('data-key', col.key);
        th.style.width = col.width;
        headerRow.appendChild(th);
    });
    
    // 2. データ行を描画
    characters.forEach(chara => {
        const row = tableBody.insertRow();
        
        visibleColumns.forEach(col => { 
            const cell = row.insertCell();
            let value = chara[col.key];

            if (col.type === "image") {
                const img = document.createElement('img');
                img.src = 'image/' + (value ?? 'placeholder.jpg'); 
                img.alt = chara.キャラ名 + 'の画像';
                img.style.width = '50px';
                img.style.height = '50px'; 
                cell.appendChild(img);
            } 
            // パーセンテージ表示
            else if (col.key === "奥義ダメ" || col.key === "奥義強化"){
                if (typeof value === 'number'){
                    // 小数点以下の表示を調整する場合は toFixed() を変更
                    cell.textContent = `${(value * 100).toFixed(0)}%`; 
                }
                else {
                    cell.textContent = value ?? ''; 
                }
            }
            else {
                cell.textContent = value ?? '';
            }
            
            // 固定列の調整（CSSで対応済みだが、ここで特定の属性を設定することも可能）
            // if (col.key === "画像リンク") cell.classList.add('fixed-column-1');
            // if (col.key === "称号" || col.key === "キャラ名") cell.classList.add('fixed-column-2');
        });
    });
    
    // データがない場合のメッセージ
    if(characters.length === 0 && tableBody.rows.length === 0){
        const row = tableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = visibleColumns.length;
        cell.textContent = '該当するキャラクターが見つかりませんでした。';
        cell.style.textAlign = 'center';
        cell.style.padding = '20px';
    }
    
    // table.style.width = 'auto'; // 必要であれば
}

// 初期データのロードとUIの初期化
loadData();