const json_file_name1 = 'blessing_data.json';
const tableBody = document.getElementById('charaTableBody');
let allCharacters = [];

// === 新規追加: 折りたたみ機能のためのDOM要素と状態変数 ===
const columnCheckboxesContainer = document.getElementById('columnCheckboxesContainer');
const columnToggleHeader = document.getElementById('columnToggleHeader');
// 初期状態: 展開 (falseに設定し、load時に折りたたむ)
let isColumnsExpanded = false; 

// === 新規追加: 折りたたみ機能のトグル関数 ===
function toggleColumnCheckboxes() {
    // コンテナ要素が存在するか確認
    if (!columnCheckboxesContainer) return;
    
    isColumnsExpanded = !isColumnsExpanded;
    
    // displayプロパティを切り替える
    columnCheckboxesContainer.style.display = isColumnsExpanded ? 'block' : 'none';
}

// ★ ここから追加・修正: 複数フィルタ機能のためのコード ★

let filterCount = 0;
// HTML側で新しく定義したコンテナのID
const filtersContainer = document.getElementById('filtersContainer'); 

// フィルタオプション（元のHTMLのselectタグの内容に基づき作成）
const FILTER_OPTIONS_HTML = `
    <option value="__all__">全列</option>
    <option value="称号">称号</option>
    <option value="キャラ名">キャラ名</option>
    <option value="有利な属性">有利な属性</option>
    <option value="加護対象勢力">加護対象勢力</option>
    <option value="レアリティ">レア</option>
    <option value="レベル">レベル</option>
    <option value="物理or魔法">物理/魔法</option>
    <option value="戦略タイプ">戦略タイプ</option>
    <option value="極み">極</option>
    <option value="属性解放">属性解放</option>
    <option value="勢力">勢力</option>
    <option value="覚醒">覚醒</option>
    <option value="加護の導きレベル">加護の導きレベル</option>
    <option value="ダメ上昇率">ダメ上昇率</option>
    <option value="加護の導き詳細">加護の導き詳細</option>
    <option value="加護スキルレベル">加護スキルレベル</option>
    <option value="加護スキル概要">加護スキル概要</option>
    <option value="加護スキル詳細">加護スキル詳細</option>
    <option value="スキルコスト上限up">スキルコスト上限up</option>
    <option value="スキルコストダウン">スキルコストダウン</option>
    <option value="スキルポイント超過付与">スキルポイント超過付与</option>
    <option value="ゲージバフ">ゲージバフ</option>
    <option value="支援加護対象">支援加護対象</option>
    <option value="支援加護内容">支援加護内容</option>
    <option value="特性">特性</option>
    <option value="英傑特性">英傑特性</option>
    <option value="入手方法">入手方法</option>
    <option value="備考">備考</option>
`;

// フィルタ条件の行を追加する関数
function addFilterRow() {
    filterCount++;
    const filterId = filterCount;

    const filterDiv = document.createElement('div');
    filterDiv.classList.add('filterRow');
    filterDiv.dataset.filterId = filterId;
    filterDiv.style.marginBottom = '8px'; 
    filterDiv.style.padding = '5px';
    filterDiv.style.border = '1px dashed #ccc';

    filterDiv.innerHTML = `
        <label for="column_${filterId}">列:</label>
        <select id="column_${filterId}" class="filterColumn" style="margin-right: 5px;">
            ${FILTER_OPTIONS_HTML}
        </select>

        <label for="search_${filterId}">絞り込み:</label>
        <input type="text" id="search_${filterId}" class="filterSearch" placeholder="検索キーワードを入力" style="margin-right: 5px; width: 150px;">
        <button type="button" onclick="removeFilterRow(${filterId})">この条件を削除</button>
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
const numericColumns = [
    "レアリティ", "レベル", "覚醒", "奥義レベル",
    "スキル1レベル", "スキル1コスト", "スキル2コスト"
];
// 元のfilterCharacters関数で数値検索対象だった列を含める
const numericSearchColumns = ['スキル1コスト', 'スキル2コスト', '奥義レベル', 'レアリティ', 'レベル', '覚醒', 'スキル1レベル', 'スキル2レベル'];

function checkFilterCondition(chara, searchColumn, searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
        return true; 
    }
    searchTerm = searchTerm.toLowerCase();

    // 'スキル1コスト or スキル2コスト'のカスタム処理
    if (searchColumn === 'スキル1コスト or スキル2コスト') {
        const searchNumber = parseFloat(searchTerm);
        if (!isNaN(searchNumber)) {
            const charaS1Cost = parseInt(chara['スキル1コスト']);
            const charaS2Cost = parseInt(chara['スキル2コスト']);
            const isS1Match = !isNaN(charaS1Cost) && charaS1Cost <= searchNumber;
            const isS2Match = !isNaN(charaS2Cost) && charaS2Cost <= searchNumber;
            return isS1Match || isS2Match;
        }
        const S1_text = String(chara['スキル1コスト'] ?? '').toLowerCase();
        const S2_text = String(chara['スキル2コスト'] ?? '').toLowerCase();
        return S1_text.includes(searchTerm) || S2_text.includes(searchTerm);
    }
    // 数値検索対象列の処理 (<= 比較)
    else if (numericSearchColumns.includes(searchColumn)) {
        const searchNumber = parseFloat(searchTerm);
        if (!isNaN(searchNumber)){
            const charaValue = parseInt(chara[searchColumn]);
            return !isNaN(charaValue) && charaValue <= searchNumber;
        }
        // 数値ではない文字列が入力された場合は、文字列検索として扱う
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


// 表示する全列の定義（ヘッダー名とJSONのキー、初期表示設定）
const COLUMN_CONFIG = [
    { header: "画像", key: "画像リンク", show: true, type: "image", width: "60px" },
    { header: "称号", key: "称号", show: false, width: "150px" },
    { header: "キャラ名", key: "キャラ名", show: true, width: "150px" },
    { header: "有利な属性", key: "有利な属性", show: true, width: "60px" },
    { header: "加護対象勢力", key: "加護対象勢力", show: true, width: "60px" },
    { header: "レア", key: "レアリティ", show: false, width: "60px" },
    { header: "レベル", key: "レベル", show: false, width: "60px" },
    { header: "物理/魔法", key: "物理or魔法", show: true, width: "90px" },
    { header: "戦略タイプ", key: "戦略タイプ", show: true, width: "90px" },
    { header: "極", key: "極み", show: false, width: "60px" },
    { header: "属性解放", key: "属性解放", show: false, width: "90px" },
    { header: "覚醒", key: "覚醒", show: false, width: "60px" },
    { header: "加護の導きレベル", key: "加護の導きレベル", show: false, width: "100px" },
    { header: "ダメ上昇率", key: "ダメ上昇率", show: false, width: "90px" },
    { header: "加護の導き詳細", key: "加護の導き詳細", show: true, width: "180px" },
    { header: "加護スキルレベル", key: "加護スキルレベル", show: true, width: "250px" },
    { header: "加護スキル概要", key: "加護スキル概要", show: true, width: "90px" },
    { header: "加護スキル詳細", key: "加護スキル詳細", show: false, width: "90px" },
    { header: "スキルコスト上限up", key: "スキルコスト上限up", show: false, width: "90px" },
    { header: "スキルコストダウン", key: "スキルコストダウン", show: false, width: "300px" },
    { header: "スキルポイント超過付与", key: "スキルポイント超過付与", show: false, width: "350px" },
    { header: "ゲージバフ", key: "ゲージバフ", show: false, width: "90px" },
    { header: "支援加護対象", key: "支援加護対象", show: false, width: "90px" },
    { header: "特性", key: "特性", show: false, width: "150px" },
    { header: "英傑特性", key: "英傑特性", show: false, width: "150px" },
    { header: "入手方法", key: "入手方法", show: false, width: "120px" },
    { header: "備考", key: "備考", show: false, width: "150px" }
];

// 列選択UIの生成
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

// チェックボックス変更時の処理
function toggleColumnVisibility(event) {
    const index = event.target.value;
    COLUMN_CONFIG[index].show = event.target.checked;
    // フィルタ関数を呼び出してテーブルを再描画
    filterCharacters(); 
}

// 全選択 (HTMLのボタンから呼ばれる)
function checkAllColumns() {
    COLUMN_CONFIG.forEach(col => col.show = true);
    document.querySelectorAll('#columnCheckboxes input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = true;
    });
    filterCharacters();
}

// 全解除 (HTMLのボタンから呼ばれる)
function uncheckAllColumns() {
    COLUMN_CONFIG.forEach(col => col.show = false);
    document.querySelectorAll('#columnCheckboxes input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // 最低限の列を表示に戻す
    COLUMN_CONFIG[0].show = true; // 画像
    COLUMN_CONFIG[2].show = true; // キャラ名
    
    // UIを更新
    const col0 = document.getElementById('col-0');
    if (col0) col0.checked = true;
    const col2 = document.getElementById('col-2');
    if (col2) col2.checked = true;

    filterCharacters();
}

async function loadData() {
    try{
        const response = await fetch(json_file_name1);
        if (!response.ok) {
             throw new Error(`HTTP error! status: ${response.status}`);
        }
        allCharacters = await response.json();
        console.log("読み込み成功");
        
        if (!Array.isArray(allCharacters)) {
            throw new Error("JSONデータが配列形式ではありません。");
        }

        setupColumnSelector(); // UIを生成
        renderTable(allCharacters);
    } catch(error){
        console.log("読み込み失敗", error);
        if(tableBody) {
             tableBody.innerHTML = `<tr><td colspan="${COLUMN_CONFIG.length}">データの読み込み失敗: ${error.message} (JSONファイルを確認してください)</td></tr>`;
        }
    }
}

function renderTable(characters){
    // 既存の行をクリア
    tableBody.innerHTML = '';

    const visibleColumns = COLUMN_CONFIG.filter(col => col.show);

    // === 1. ヘッダーを動的に作成する処理 ===
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
    
    // --- 2. データ行を描画 ---
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
            else if (col.key === "ダメ上昇率"){
                if (typeof value === 'number'){
                    cell.textContent = `${(value * 100).toFixed(0)}%`;
                }
                else {
                    cell.textContent = value ?? ''; 
                }
            }
            else {
                cell.textContent = value ?? '';
            }
        });
    });
    
    charaTable.style.width = 'auto';
}

// ★ ここから修正: 既存のfilterCharacters関数を、複数条件に対応したロジックに置き換え ★
function filterCharacters() {
    // すべてのフィルタ条件の行を取得
    const filterRows = document.querySelectorAll('#filtersContainer .filterRow');
    
    // 適用するフィルタ条件を格納する配列
    const filters = [];
    
    // 1. すべてのフィルタ条件を取得
    filterRows.forEach(row => {
        const columnSelect = row.querySelector('.filterColumn');
        const searchInput = row.querySelector('.filterSearch');
        
        if (columnSelect && searchInput) {
            const searchColumn = columnSelect.value;
            const searchTerm = searchInput.value.trim();
            
            // 検索キーワードが入力されている条件のみを有効なフィルタとして格納
            if (searchTerm) {
                filters.push({ searchColumn, searchTerm });
            }
        }
    });

    // フィルタ条件が一つもない場合は全表示
    if (filters.length === 0) {
        renderTable(allCharacters);
        return;
    }

    // 2. フィルタを適用 (すべての条件をANDでチェック)
    const filteredCharacters = allCharacters.filter(chara => {
        // .every() は配列のすべての要素がテスト関数を満たせば true を返します (AND条件)
        return filters.every(filter => {
            return checkFilterCondition(chara, filter.searchColumn, filter.searchTerm);
        });
    });

    renderTable(filteredCharacters);
}


loadData();
window.addEventListener('load', () => {
    if (columnToggleHeader) {
        columnToggleHeader.addEventListener('click', toggleColumnCheckboxes);
    }
    // 初期状態で折りたたむ
    if (columnCheckboxesContainer) columnCheckboxesContainer.style.display = 'none'; 
    
    // ★ ページロード時に最初のフィルタ条件行を追加
    addFilterRow(); 
});