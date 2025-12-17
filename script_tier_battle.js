const tierListContainer = document.getElementById('tierListContainer');
const json_file_name = 'tier_battle_data.json'; // キャラクターデータとTier情報を持つJSON

// 実行用のダミーデータ構造（tier_battle_data.json の例）
// [
//   { "Tier": "Tier1", "キャラ名": "リムル1", "画像リンク": "rimuru1.jpg", "備考": "最強の戦闘キャラ" },
//   { "Tier": "Tier1", "キャラ名": "ミリム", "画像リンク": "milim.jpg", "備考": "" },
//   { "Tier": "Tier2", "キャラ名": "シズ", "画像リンク": "shizu.jpg", "備考": "" },
//   // ... Tier5までのデータが続く
// ]


async function loadTierData() {
    try{
        const response = await fetch(json_file_name);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const characters = await response.json();
        
        if (!Array.isArray(characters)) throw new Error("JSONデータが配列形式ではありません。");

        renderTierList(characters);

    } catch(error){
        console.error("Tierデータの読み込み失敗", error);
        if(tierListContainer) {
            tierListContainer.innerHTML = `<p style="color: #dc3545;">データの読み込み失敗: ${error.message} (JSONファイルを確認してください)</p>`;
        }
    }
}

function renderTierList(characters){
    tierListContainer.innerHTML = '';
    
    // Tierごとにキャラクターをグループ化
    const tieredData = characters.reduce((acc, chara) => {
        const tier = chara.Tier || '未分類';
        if (!acc[tier]) acc[tier] = [];
        acc[tier].push(chara);
        return acc;
    }, {});
    
    // Tierの表示順序を定義 (要望に合わせてTier1からTier5まで)
    const tierOrder = ['Tier1', 'Tier2', 'Tier3', 'Tier4', 'Tier5', '未分類'];
    
    tierOrder.forEach(tier => {
        const charasList = tieredData[tier];
        if (charasList && charasList.length > 0) {
            
            const panel = document.createElement('div');
            panel.classList.add('tier-panel');
            panel.id = tier.toLowerCase().replace(/\s/g, ''); // id="tier1" などを設定
            
            // Tier ヘッダー
            const header = document.createElement('div');
            header.classList.add('tier-header');
            header.textContent = tier;
            panel.appendChild(header);
            
            // キャラクターリストコンテナ
            const list = document.createElement('div');
            list.classList.add('chara-list');
            
            charasList.forEach(chara => {
                const item = document.createElement('div');
                item.classList.add('chara-item');
                
                const img = document.createElement('img');
                img.src = 'image/' + (chara.画像リンク ?? 'placeholder.jpg'); 
                img.alt = chara.キャラ名;
                item.appendChild(img);
                
                const name = document.createElement('p');
                name.textContent = chara.キャラ名;
                item.appendChild(name);
                
                list.appendChild(item);
            });
            
            panel.appendChild(list);
            tierListContainer.appendChild(panel);
        }
    });

    // どのTierにも入っていない場合 (保険)
    if (Object.keys(tieredData).length === 0) {
         tierListContainer.innerHTML = `<p style="text-align: center;">Tierデータが読み込まれていません。</p>`;
    }
}

loadTierData();

// tier_blessing.html はこのコードのファイル名とJSON名を変更するだけで対応可能です。