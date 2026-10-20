// window.bgAudio = new Audio('audio/bg.mp3')

let TEST_INTERVAL = 6 // 测验间隔
let listTemp = []
window.dataList.forEach((item, ind) => {
  listTemp.push(item)
  if (ind > 2 && ind % TEST_INTERVAL === 0) listTemp.push({
    w: '测验',
    isTest: true
  })
})

Vue.createApp({
  data() {
    return {
      flag: 1,
      bgPlay: true,
      notStart: true,
      list: listTemp,
      message: 'Hello Vue!',
      lockInd: 0,
      currItem: null,
      currInd: 0,
      randomList: [],
      hanziShow: true,
      cardShow: false,
      gameShow: false,
      gameStep: [],
      gameType: 'listen', // listen fill stroke draw
      gameStatus: null, // init playing end
      strokeStatus: null, // [0, 1]
      drawStatus: null, // 1 - 100
      drawImg: null,
      audioBg: null,
      theme: 'default', // default green
      isClickRead: false, // 是否点读模式,
      freeUnlock: true, // 是否放开顺序锁（默认放开，可任意学后面的字）
      currTest: false,
      drawType: 'slide-up',
      drawTypeList: ['slide-up', 'slide-down', 'slide-left', 'slide-right', 'fade', 'scale', 'circle'],
      drawColor: '#fff',
    }
  },
  created() {
    const local = loadLocalProgress()
    this.lockInd = local.lockInd || 0
    this.bgPlay = getStorage('bgPlay') === null ? true : getStorage('bgPlay')
    this.freeUnlock = getStorage('freeUnlock') === null ? true : getStorage('freeUnlock')
    this.theme = getStorage('theme') || 'default'
    // URL 快捷同步：?lock=123
    try {
      const q = new URLSearchParams(location.search).get('lock')
      if (q !== null && q !== '' && !isNaN(Number(q))) {
        this.lockInd = parseInt(q, 10)
        saveLocalProgress(this.lockInd)
      }
    } catch (e) {
      console.warn('解析 lock 参数失败 reason=lock_query_fail', e)
    }
  },
  mounted() {
    this.audioBg = document.getElementById('audioBg')
    this.audioBg.volume = 0.3
    loadScripts()
    setTimeout(() => this.goTop(), 1000)
    document.addEventListener("visibilitychange", () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        if (this.bgPlay && this.hanziShow) this.playBg()
      } else {
        if (this.bgPlay && this.hanziShow) this.playBg(true)
      }
    });
    syncProgressFromCloud('data/progress.json').then((p) => {
      try {
        if (p && typeof p.lockInd === 'number' && p.lockInd !== this.lockInd) {
          this.lockInd = p.lockInd
          if (p.from === 'cloud') dnotify('已从云端进度同步到第 ' + p.lockInd + ' 关', 2500)
        }
        if (this.lockInd > 420) {
          let temp = document.createElement('script')
          temp.src = './js/lib/dataWriter1.js'
          document.body.appendChild(temp)
        }
      } catch (e) {
        console.warn('应用云端进度失败 reason=apply_cloud_fail', e)
      }
    })
  },
  methods: {
    speakText: speakText,
    changeTheme() {
      this.theme = this.theme === 'default' ? 'green' : 'default'
      setStorage('theme', this.theme)
    },
    toggleBg() {
      this.bgPlay = !this.bgPlay
      setStorage('bgPlay', this.bgPlay)
      if (this.bgPlay) {
        this.playBg(true)
      } else {
        this.playBg()
      }
    },
    toggleCr() {
      this.isClickRead = !this.isClickRead
      if (this.isClickRead) {
        this.playBg()
      } else if (this.bgPlay) {
        this.playBg(true)
      }
      dnotify(`已切换为${  this.isClickRead ? '点读模式' : '学习模式' }模式`)
    },
    toggleFreeUnlock() {
      this.freeUnlock = !this.freeUnlock
      setStorage('freeUnlock', this.freeUnlock)
      dnotify(this.freeUnlock ? '已放开：可任意学习汉字' : '已开启顺序学习：需先学前一个字')
    },
    playBg(isPlay) {
      if (isPlay === true) {
        this.audioBg.play()
      } else {
        this.audioBg.pause()
      }
    },
    goTop() {
      // document.getElementById('hanzi-list').scrollTo({ top: 0, behavior: 'smooth'});
      document.querySelector(`#hanzi-list > .hanzi-item:nth-of-type(${this.lockInd + 1})`).scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    },
    startApp() {
      this.notStart = false
      this.bgPlay && this.playBg(true)
    },
    goBack(step) {
      playAudio('click')
      this.hanziShow = this.currTest || step == 1;
      this.cardShow = !this.currTest && step == 2;
      this.gameShow = false;
      this.gameStatus = null
      this.strokeStatus = null
      this.drawStatus = null
      if (step == 1 && this.bgPlay) this.playBg(true)
    },
    hanziClick(item, ind) {
      if (this.isClickRead) return speakText(item.w, 1, 0.6, 1.5)
      if (!this.freeUnlock && this.lockInd < ind) return playAudio('lock') && myAlert('小朋友请先学习前面的汉字哦~', 10);
      this.audioBg.pause()
      this.currInd = ind;
      this.currTest = !!item.isTest;
      if (item.isTest) {
        let temp = this.list
          .filter((x, i) => i >= ind - (TEST_INTERVAL) && i < ind)
          .sort(() => Math.random() - 0.5) // .slice(0, 3)
        this.randomList = temp.map(item => ({ ...item }));
        this.currItem = temp[Math.floor(Math.random() * temp.length)]
        this.gameStep = [1];
        this.hanziShow = false;
        this.cardShow = true;
        this.goGame('listen')
      } else {
        // 随机抽取ind周围前后20个之内的3个汉字
        this.currItem = item;
        let temp = window.dataList
          .filter((x, i) => i >= ind - 20 && i <= ind + 20 && x.w != item.w)
          .sort(() => Math.random() - 0.5).slice(0, 3)
        // temp随机一个位置插入currItem
        temp.splice(Math.floor(Math.random() * temp.length), 0, item)
        this.randomList = temp.map(item => ({ ...item }));
        this.gameStep = [];
        this.hanziShow = false;
        this.cardShow = true;
        setTimeout(() => this.readItem(item), 100)
      }
    },
    readItem(item, onlyOne) {
      item = item || this.currItem;
      console.log(item);
      speakText(onlyOne ? item.w : (item.w + ', ' + item.p + '的' + item.w))
    },
    goGame(type) {
      if (this.lockInd == this.currInd && ((type === 'listen' && this.gameStep.length < 1)
        || (type === 'draw' && this.gameStep.length < 2))) return playAudio('gamelock')
      this.cardShow = false;
      this.gameType = type;
      this.gameShow = true
      this.randomList.forEach(x => x.status = '')
      setTimeout(() => {
        const isPlayTip = this.lockInd < 11
        if (isPlayTip) playAudio(`game-${type}`) // 10关以内播放提示
        if (type === 'stroke') {
          this.strokeStatus = null
          listHanzi(document.getElementById('stroke-list'), this.currItem.w, 46)
          aniHanzi(document.getElementById('stroke-ani'), this.currItem.w, 160)
          writeHanzi(document.getElementById('stroke-write'), this.currItem.w, 180, (_, finish, total) => {
            this.strokeStatus = [finish, total]
            if (finish === total) {
              playAudio('correct')
              playAudio('correct-stroke')
              if (!this.gameStep.includes(1)) this.gameStep.push(1)
            }
          })
        }
        if (type === 'listen') {
          setTimeout(() => speakText(this.currItem.w, 3), isPlayTip ? 2200 : 500)
        }
        if (type === 'draw') {
          setTimeout(() => speakText(this.currItem.w, 3, 0.5), isPlayTip ? 2500 : 500)
          let len = 66
          // 随机一个
          this.drawImg = `./img/draw/draw${Math.floor(Math.random() * len + 1)}.webp`
          this.drawStatus = 0
          this.drawType = this.drawTypeList[Math.floor(Math.random() * this.drawTypeList.length)]
          this.drawColor = getRandomColor()
        }
      }, 500)
    },
    listenClick(item) {
      this.randomList.forEach(x => x.status = '')
      if (this.gameStatus == 'correct') return
      if (item.w == this.currItem.w) {
        console.log(6666666666);
        playAudio('correct')
        playAudio('correct-listen')
        item.status = 'correct'
        this.gameStatus = 'correct'
        if (!this.gameStep.includes(2)) this.gameStep.push(2)
        if (this.currTest) {
          if (this.currInd == this.lockInd) this.addLockInd()
          setTimeout(() => this.goBack(1), 1200)
        }
      } else {
        playAudio('wrong')
        item.status = 'wrong'
        this.gameStatus = 'wrong'
      }
    },
    drawClick(item) {
      this.randomList.forEach(x => x.status = '')
      console.log('drawClick..........');
      if (this.drawStatus === 100) {
        return
      }
      if (item.w == this.currItem.w) {
        playAudio('correct')
        item.status = 'correct'
        let temp = this.drawStatus + 10
        this.drawStatus = temp > 100 ? 100 : temp
        if (this.drawStatus === 100) {
          playAudio('correct-stroke')
          this.gameStatus = 'correct'
          if (!this.gameStep.includes(3)) this.gameStep.push(3)
          if (this.currInd == this.lockInd) {
            this.addLockInd()
            setTimeout(() => this.goBack(1), 1000)
          }
        }

      } else {
        playAudio('wrong1')
        item.status = 'wrong'
        let temp = this.drawStatus - 10
        this.drawStatus = temp < 0 ? 0 : temp
      }
    },
    addLockInd() {
      this.lockInd += 1
      saveLocalProgress(this.lockInd)
    },
    flagClick() {
      this.flag++
      if (this.flag == 10) {
        this.flag = 0
        let tip = '当前进度 ' + this.lockInd + '\n输入关卡数字可改进度\n输入 sync 复制云端进度文件内容（粘贴到 data/progress.json 后推送即可多端同步）'
        let ind = window.prompt(tip)
        if (!ind || !ind.trim()) return
        ind = ind.trim()
        if (ind.toLowerCase() === 'sync') {
          try {
            const text = progressJsonText(this.lockInd)
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(text).then(() => alert('已复制，请粘贴覆盖 data/progress.json 并推送到 GitHub'))
            } else {
              window.prompt('请手动复制以下内容到 data/progress.json', text)
            }
          } catch (e) {
            console.warn('导出进度失败 reason=export_progress_fail', e)
            alert('导出失败，请重试')
          }
          return
        }
        if (!isNaN(ind)) {
          saveLocalProgress(parseInt(ind, 10))
          location.reload()
        }
      }
    },
    goMath() {
      window.location.href = './math/index.html'
    },
    goPoem() {
      window.location.href = './poem/index.html'
    },
  },
}).mount('body')
