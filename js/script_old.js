Vue.createApp({
  data() {
    return {
      list: window.dataList,
      message: 'Hello Vue!'
    }
  },
  created() {
    
  },
  methods: {
    
  },
}).mount('#app')

document.addEventListener('DOMContentLoaded', () => {

  let currentCharacterIndex = 0
  let currentQuiz = [] // 当前游戏的问题队列
  let quizScore = 0
  let quizQuestionCount = 0
  let currentGameType = ''

  let currentHanziIndex = 0
  let unlockedHanziCount = 1 // Initially, only the first hanzi is unlocked

  function saveProgress() {
    localStorage.setItem('unlockedHanziCount', unlockedHanziCount)
  }

  function loadProgress() {
    const savedCount = localStorage.getItem('unlockedHanziCount')
    if (savedCount) {
      unlockedHanziCount = parseInt(savedCount, 10)
    }
  }

  // 获取DOM元素
  const hanziSection = document.getElementById('hanzi-section')
  const hanziList = document.getElementById('hanzi-list')
  const characterDisplay = document.getElementById('character')
  const pinyinDisplay = document.getElementById('pinyin')
  const meaningDisplay = document.getElementById('meaning')
  const charAudio = document.getElementById('charAudio')
  const playAudioBtn = document.getElementById('playAudio')
  const prevCharBtn = document.getElementById('prevChar')
  const nextCharBtn = document.getElementById('nextChar')

  const learningSection = document.getElementById('learning-section')
  const gameSection = document.getElementById('game-section')
  const gameContent = document.getElementById('game-content')
  const gameButtons = document.querySelectorAll('.game-button')
  const nextQuestionBtn = document.getElementById('nextQuestion')
  const backToLearnBtn = document.getElementById('backToLearn')
  const correctSound = document.getElementById('correctSound')
  const wrongSound = document.getElementById('wrongSound')
  const feedbackIcon = document.getElementById('feedback-icon')
  const feedbackText = document.getElementById('feedback-text')

  function renderHanziList() {
    hanziList.innerHTML = ''
    dataList.forEach((hanzi, index) => {
      const hanziItem = document.createElement('div')
      hanziItem.classList.add('hanzi-item')
      hanziItem.textContent = hanzi.w

      const isUnlocked = index < unlockedHanziCount
      if (!isUnlocked) {
        hanziItem.classList.add('locked')
      } else {
        hanziItem.addEventListener('click', () => {
          currentHanziIndex = index
          showLearnPage(hanzi)
        })
      }
      hanziList.appendChild(hanziItem)
    })
  }

  renderHanziList()

  function showLearnPage(hanzi) {
    hanziSection.classList.add('hidden')
    learnHanzi.textContent = hanzi.char
    learnPinyin.textContent = `拼音: ${hanzi.pinyin}`
    learnWord.textContent = `词语: ${hanzi.word}`
    learnSentence.textContent = `例句: ${hanzi.sentence}`
    playAudioBtn.onclick = () => speakHanzi(hanzi.char)
    showPage(learnpage)
  }

  // --- 学习模式功能 ---

  function displayCharacter(index) {
    if (index < 0) {
      currentCharacterIndex = characters.length - 1
    } else if (index >= characters.length) {
      currentCharacterIndex = 0
    } else {
      currentCharacterIndex = index
    }

    const charData = characters[currentCharacterIndex]
    characterDisplay.textContent = charData.char
    pinyinDisplay.textContent = charData.pinyin
    meaningDisplay.textContent = charData.meaning
    charAudio.src = charData.audio
    playAudio() // 自动播放当前汉字发音
  }

  function playAudio() {
    charAudio.play().catch((e) => console.error('Error playing audio:', e))
  }

  // 事件监听
  playAudioBtn.addEventListener('click', playAudio)
  characterDisplay.addEventListener('click', playAudio) // 点击汉字也播放声音

  prevCharBtn.addEventListener('click', () => {
    displayCharacter(currentCharacterIndex - 1)
  })

  nextCharBtn.addEventListener('click', () => {
    displayCharacter(currentCharacterIndex + 1)
  })

  // 初始化显示第一个汉字
  displayCharacter(0)

  // --- 游戏模式功能 ---

  gameButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      currentGameType = event.target.dataset.game
      startGame(currentGameType)
    })
  })

  backToLearnBtn.addEventListener('click', () => {
    gameSection.classList.add('hidden')
    learningSection.classList.remove('hidden')
    feedbackIcon.textContent = ''
    feedbackText.textContent = ''
    nextQuestionBtn.classList.add('hidden') // 确保返回时隐藏下一题按钮
  })

  nextQuestionBtn.addEventListener('click', () => {
    nextQuizQuestion()
  })

  function startGame(gameType) {
    learningSection.classList.add('hidden')
    gameSection.classList.remove('hidden')
    quizScore = 0
    quizQuestionCount = 0
    feedbackIcon.textContent = ''
    feedbackText.textContent = ''
    nextQuestionBtn.classList.add('hidden') // 游戏开始时隐藏下一题按钮

    // 准备问题：随机选择一部分汉字作为游戏问题
    const shuffledCharacters = [...characters].sort(() => 0.5 - Math.random())
    currentQuiz = shuffledCharacters.slice(0, Math.min(shuffledCharacters.length, 5)) // 每次游戏5个字
    if (currentQuiz.length === 0) {
      gameContent.innerHTML = '<p>没有可用的汉字数据进行游戏。</p>'
      return
    }
    nextQuizQuestion()
  }

  function nextQuizQuestion() {
    feedbackIcon.textContent = ''
    feedbackText.textContent = ''
    nextQuestionBtn.classList.add('hidden') // 每次新问题隐藏下一题按钮

    if (quizQuestionCount >= currentQuiz.length) {
      endGame()
      return
    }

    const currentQuestionChar = currentQuiz[quizQuestionCount]
    gameContent.innerHTML = '' // 清空内容

    let questionHTML = ''
    let options = []
    let correctOptionValue

    switch (currentGameType) {
      case 'listen_identify':
        questionHTML = `<p class="question-text">听声音，选择正确的汉字：</p>`
        charAudio.src = currentQuestionChar.audio
        charAudio.play()
        options = generateOptions(currentQuestionChar, 'char')
        correctOptionValue = currentQuestionChar.char
        break
      case 'char_meaning':
        questionHTML = `<p class="question-text">"${currentQuestionChar.char}" 的意思是什么？</p>`
        options = generateOptions(currentQuestionChar, 'meaning')
        correctOptionValue = currentQuestionChar.meaning
        break
      case 'pinyin_match':
        questionHTML = `<p class="question-text">"${currentQuestionChar.char}" 的拼音是什么？</p>`
        options = generateOptions(currentQuestionChar, 'pinyin')
        correctOptionValue = currentQuestionChar.pinyin
        break
      default:
        break
    }

    const optionsGrid = document.createElement('div')
    optionsGrid.classList.add('options-grid')
    options.forEach((opt) => {
      const button = document.createElement('button')
      button.classList.add('option-button')
      button.textContent = opt
      button.dataset.value = opt // 将选项值存储在dataset中
      button.addEventListener('click', () => checkAnswer(button, correctOptionValue))
      optionsGrid.appendChild(button)
    })

    gameContent.innerHTML = questionHTML
    gameContent.appendChild(optionsGrid)

    quizQuestionCount++
  }

  function generateOptions(correctCharData, type) {
    const allPossibleOptions = characters.map((c) => c[type])
    let options = [correctCharData[type]] // 包含正确答案

    // 添加3个不同的错误答案
    while (options.length < 4) {
      const randomChar = characters[Math.floor(Math.random() * characters.length)]
      const randomOption = randomChar[type]
      if (!options.includes(randomOption)) {
        options.push(randomOption)
      }
    }
    // 随机打乱选项顺序
    return options.sort(() => 0.5 - Math.random())
  }

  function checkAnswer(selectedButton, correctValue) {
    // 禁用所有选项按钮，防止重复点击
    const optionButtons = gameContent.querySelectorAll('.option-button')
    optionButtons.forEach((btn) => (btn.disabled = true))

    if (selectedButton.dataset.value === correctValue) {
      quizScore++
      selectedButton.classList.add('correct')
      feedbackIcon.textContent = '✅'
      feedbackText.textContent = '太棒了！'
      correctSound.play()
    } else {
      selectedButton.classList.add('wrong')
      // 找到并高亮正确答案
      optionButtons.forEach((btn) => {
        if (btn.dataset.value === correctValue) {
          btn.classList.add('correct')
        }
      })
      feedbackIcon.textContent = '❌'
      feedbackText.textContent = '再试一次哦！'
      wrongSound.play()
    }
    nextQuestionBtn.classList.remove('hidden') // 显示下一题按钮
  }

  function endGame() {
    gameContent.innerHTML = `
            <p class="question-text">游戏结束！</p>
            <p style="font-size: 2em; color: #4CAF50;">你答对了 ${quizScore} / ${currentQuiz.length} 题！</p>
            <p style="font-size: 1.5em; margin-top: 20px;">继续学习，你会越来越棒的！</p>
        `
    feedbackIcon.textContent = ''
    feedbackText.textContent = ''
    nextQuestionBtn.classList.add('hidden') // 游戏结束时隐藏下一题按钮
  }
})
