// --- ファイル名: script_gacha.js ---

// --- 1. 定数と確率設定 (パーセント表記) ---
const PROBABILITIES_PERCENT = {
    STAR5_TOTAL: 6.000,
    STAR4: 30.000,
    STAR3: 64.000,
    PICKUP_RATIO: 0.00700 / 0.03572,
    EXTREME_RATIO: 0.01228 / 0.03572,
    STAR5_OTHER_RATIO: 0.01644 / 0.03572
};

// --- 2. 状態管理 ---
let CHARA_POOLS = {};
let gacha_history = [];
let totalPulls = 0;

// --- 3. DOM要素の参照 ---
const RESULT_CONTAINER = document.getElementById('resultContainer');
const RESULT_DISPLAY = document.getElementById('gachaResultDisplay');
const CUMULATIVE_RESULT_DISPLAY = document.getElementById('cumulativeResultDisplay');

const COUNT_5 = document.getElementById('count5');
const COUNT_4 = document.getElementById('count4');
const COUNT_3 = document.getElementById('count3');

const TOTAL_PULLS = document.getElementById('totalPulls');
const TOTAL_COUNT_5 = document.getElementById('totalCount5');
const TOTAL_COUNT_4 = document.getElementById('totalCount4');
const TOTAL_COUNT_3 = document.getElementById('totalCount3');
const TOTAL_RATE_5 = document.getElementById('totalRate5');
const TOTAL_RATE_4 = document.getElementById('totalRate4');
const TOTAL_RATE_3 = document.getElementById('totalRate3');

// --- 4. データロードとキャラクター分類 (最新のフィルタリングロジック) ---
async function loadCharacterPools() {
    try {
        // キャッシュバスターを追加 (強制再読み込み)
        const timestamp = new Date().getTime();
        const url = `battle_data.json?v=${timestamp}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`データファイルの読み込みに失敗しました。ファイル名: battle_data.json (ステータスコード: ${response.status})`);
        }
        const data = await response.json();

        let all_extreme_chars = [];
        let all_star5_other_chars = [];
        let total_target_star5 = 0;

        // JSONデータに '排出対象' 列があるかチェック
        if (data.length > 0 && !data[0].hasOwnProperty("排出対象")) {
            console.error("【重要】JSONデータに '排出対象' 列が見つかりません。すべての★5キャラクターが抽選対象から除外されます。");
        }

        data.forEach(chara => {
            const rarity_type = chara["初期レアリティ"];
            let is_gacha_target = false;
            
            // ★★★ 排出対象の柔軟な判定ロジック ★★★
            if (chara.hasOwnProperty("排出対象")) {
                 // 値を文字列に変換し、トリム・小文字化して '○' または 'o' と比較
                 const target_value = String(chara["排出対象"]).trim().toLowerCase();
                 if (target_value === '〇' || target_value === 'o') {
                     is_gacha_target = true;
                 }
            }
            // ★★★ 判定ロジックここまで ★★★

            if (is_gacha_target) {
                
                // ★5相当のキャラクターのみを抽選プールに含める
                if (rarity_type && ["極", "属性解放", "星5"].includes(rarity_type)) {
                    
                    const isExtreme = (rarity_type === "極" || rarity_type === "属性解放") && chara["極み"] === "済";
                    
                    const chara_info = {
                        name: chara["キャラ名"] + " [" + chara["称号"] + "]",
                        image: chara["画像リンク"], 
                        rarity: 5, // 抽選ロジック用
                        is_extreme: isExtreme,
                        initial_rarity: rarity_type // 画像表示条件用
                    };
                    
                    if (isExtreme) {
                        all_extreme_chars.push(chara_info);
                    } else {
                        all_star5_other_chars.push(chara_info);
                    }
                    total_target_star5++;
                }
            }
        });
        
        // ログ出力で検証を助ける
        console.log(`【ガチャプール状況】: 抽選対象の★5以上のキャラクターは ${total_target_star5} 体です。`);
        if (total_target_star5 === 0) {
             console.warn("!! 抽選対象の★5キャラクターが0体です。ダミーキャラクターのみが排出されます。Excelの '排出対象' 列の値を確認してください。");
        }

        // プールが空の場合のフォールバック処理
        const fallbackChara = { name: 'ピックアップ極みA(仮)', image: 'placeholder_p.jpg', rarity: 5, is_extreme: true, initial_rarity: '極' };
        
        const pickupChara = all_extreme_chars.length > 0 ? all_extreme_chars.shift() : 
            all_star5_other_chars.length > 0 ? all_star5_other_chars.shift() : 
            fallbackChara;

        CHARA_POOLS = {
            Pickup: [pickupChara],
            Extreme: all_extreme_chars,
            Star5: all_star5_other_chars,
            // ★4, ★3は確率維持のため常に含める
            Star4: [{ name: '★4 キャラ', image: 'placeholder4.jpg', rarity: 4, is_extreme: false, initial_rarity: '星4' }], 
            Star3: [{ name: '★3 キャラ', image: 'placeholder3.jpg', rarity: 3, is_extreme: false, initial_rarity: '星3' }],
            Guarantee: [pickupChara].concat(all_extreme_chars)
        };
        
        console.log("キャラクターデータロード完了。");

    } catch (error) {
        console.error('データファイルのロードまたは処理に失敗:', error);
        alert(`データファイルの読み込みエラー: ${error.message}。\nガチャシミュレーションは動作しますが、キャラ名はダミー表示になります。`);
        // エラー時のフォールバックデータ
        CHARA_POOLS = {
            Pickup: [{ name: 'ピックアップ極みA(仮)', image: 'dummy_p.jpg', rarity: 5, is_extreme: true, initial_rarity: '極' }],
            Extreme: [{ name: '極みキャラB(仮)', image: 'dummy_e.jpg', rarity: 5, is_extreme: true, initial_rarity: '属性解放' }],
            Star5: [{ name: '★5キャラC(仮)', image: 'dummy_5.jpg', rarity: 5, is_extreme: false, initial_rarity: '星5' }],
            Star4: [{ name: '★4 キャラ', image: 'placeholder4.jpg', rarity: 4, is_extreme: false, initial_rarity: '星4' }],
            Star3: [{ name: '★3 キャラ', image: 'placeholder3.jpg', rarity: 3, is_extreme: false, initial_rarity: '星3' }],
            Guarantee: [{ name: 'ピックアップ極みA(仮)', image: 'dummy_p.jpg', rarity: 5, is_extreme: true, initial_rarity: '極' }, { name: '極みキャラB(仮)', image: 'dummy_e.jpg', rarity: 5, is_extreme: true, initial_rarity: '属性解放' }]
        };
    }
}

// --- 5. 抽選ロジック (変更なし) ---
function drawOneNormal() {
    const rand = Math.random() * 100; 
    let cumulativeProb = 0;
    
    cumulativeProb += PROBABILITIES_PERCENT.STAR5_TOTAL;
    if (rand < cumulativeProb) {
        // ★5 内訳抽選
        const randSub = Math.random(); 
        let cumulativeSubProb = 0;
        
        cumulativeSubProb += PROBABILITIES_PERCENT.PICKUP_RATIO;
        if (randSub < cumulativeSubProb && CHARA_POOLS.Pickup.length > 0) {
            return CHARA_POOLS.Pickup[Math.floor(Math.random() * CHARA_POOLS.Pickup.length)];
        }
        
        cumulativeSubProb += PROBABILITIES_PERCENT.EXTREME_RATIO;
        if (randSub < cumulativeSubProb && CHARA_POOLS.Extreme.length > 0) {
            return CHARA_POOLS.Extreme[Math.floor(Math.random() * CHARA_POOLS.Extreme.length)];
        }
            
        if (CHARA_POOLS.Star5.length > 0) {
             return CHARA_POOLS.Star5[Math.floor(Math.random() * CHARA_POOLS.Star5.length)];
        }
        return CHARA_POOLS.Guarantee[Math.floor(Math.random() * CHARA_POOLS.Guarantee.length)];
    }

    cumulativeProb += PROBABILITIES_PERCENT.STAR4;
    if (rand < cumulativeProb) {
        return CHARA_POOLS.Star4[0];
    }
    
    return CHARA_POOLS.Star3[0];
}

// --- 6. シミュレーション実行 (変更なし) ---
function simulateGacha() {
    if (Object.keys(CHARA_POOLS).length === 0) {
        alert("キャラクターデータがまだロードされていません。しばらく待ってから再度お試しください。");
        return;
    }

    RESULT_DISPLAY.innerHTML = '';
    let currentResults = [];
    
    for (let i = 0; i < 10; i++) {
        currentResults.push(drawOneNormal());
    }
    
    gacha_history.push(...currentResults);
    totalPulls = gacha_history.length;
    
    displayCurrentResults(currentResults);
    updateCumulativeSummary();
    updateCumulativeImages(currentResults);
}


// --- 7. 結果表示と履歴管理 (変更なし) ---
function displayCurrentResults(pulledCharacters) {
    let count5 = 0;
    let count4 = 0;
    let count3 = 0;
    
    pulledCharacters.forEach(chara => {
        if (chara.rarity === 5) count5++;
        else if (chara.rarity === 4) count4++;
        else if (chara.rarity === 3) count3++;
        
        // 画像表示の条件: initial_rarity が ★5相当であるか
        if (chara.initial_rarity && ["極", "属性解放", "星5"].includes(chara.initial_rarity)) {
            const charaDiv = document.createElement('div');
            charaDiv.classList.add('pulled-chara');
            
            const img = document.createElement('img');
            img.src = chara.image.startsWith('http') || chara.image.startsWith('https') 
                      ? chara.image 
                      : 'image/' + chara.image;
            img.alt = chara.name;

            if (chara.is_extreme) {
                img.classList.add('extreme');
            } else if (CHARA_POOLS.Pickup.some(p => p.name === chara.name)) {
                img.classList.add('pickup');
            }
            charaDiv.appendChild(img);
            
            const tag = document.createElement('span');
            tag.classList.add('rarity-tag');
            // タグの表示ロジック
            tag.textContent = chara.is_extreme ? '極み' : (chara.initial_rarity === '星5' ? '★5' : chara.initial_rarity); 
            charaDiv.appendChild(tag);

            const nameText = document.createElement('p');
            nameText.textContent = chara.name;
            charaDiv.appendChild(nameText);
            
            RESULT_DISPLAY.appendChild(charaDiv);
        }
    });

    COUNT_5.textContent = count5;
    COUNT_4.textContent = count4;
    COUNT_3.textContent = count3;
    
    RESULT_CONTAINER.style.display = 'block';
}

function updateCumulativeSummary() {
    if (totalPulls === 0) {
        TOTAL_PULLS.textContent = 0;
        TOTAL_COUNT_5.textContent = 0;
        TOTAL_COUNT_4.textContent = 0;
        TOTAL_COUNT_3.textContent = 0;
        TOTAL_RATE_5.textContent = '0.000';
        TOTAL_RATE_4.textContent = '0.000';
        TOTAL_RATE_3.textContent = '0.000';
        return;
    }

    const totalCount5 = gacha_history.filter(c => c.rarity === 5).length;
    const totalCount4 = gacha_history.filter(c => c.rarity === 4).length;
    const totalCount3 = gacha_history.filter(c => c.rarity === 3).length;

    TOTAL_PULLS.textContent = totalPulls;
    TOTAL_COUNT_5.textContent = totalCount5;
    TOTAL_COUNT_4.textContent = totalCount4;
    TOTAL_COUNT_3.textContent = totalCount3;
    
    TOTAL_RATE_5.textContent = ((totalCount5 / totalPulls) * 100).toFixed(3);
    TOTAL_RATE_4.textContent = ((totalCount4 / totalPulls) * 100).toFixed(3);
    TOTAL_RATE_3.textContent = ((totalCount3 / totalPulls) * 100).toFixed(3);
}

function updateCumulativeImages(newPulledCharacters) {
    newPulledCharacters.forEach(chara => {
        // 画像表示の条件: initial_rarity が ★5相当であるか
        if (chara.initial_rarity && ["極", "属性解放", "星5"].includes(chara.initial_rarity)) {
            const charaDiv = document.createElement('div');
            charaDiv.classList.add('pulled-chara');
            
            const img = document.createElement('img');
            img.src = chara.image.startsWith('http') || chara.image.startsWith('https') 
                      ? chara.image 
                      : 'image/' + chara.image;
            img.alt = chara.name;
            
            if (chara.is_extreme) {
                img.classList.add('extreme');
            } else if (CHARA_POOLS.Pickup.some(p => p.name === chara.name)) {
                img.classList.add('pickup');
            }
            charaDiv.appendChild(img);
            
            const tag = document.createElement('span');
            tag.classList.add('rarity-tag');
            tag.textContent = chara.is_extreme ? '極み' : (chara.initial_rarity === '星5' ? '★5' : chara.initial_rarity);
            charaDiv.appendChild(tag);
            
            CUMULATIVE_RESULT_DISPLAY.appendChild(charaDiv);
        }
    });
}

function resetHistory() {
    gacha_history = [];
    totalPulls = 0;
    RESULT_DISPLAY.innerHTML = '';
    CUMULATIVE_RESULT_DISPLAY.innerHTML = '';
    RESULT_CONTAINER.style.display = 'none';
    updateCumulativeSummary();
    alert("ガチャ履歴をリセットしました。");
}

window.onload = loadCharacterPools;