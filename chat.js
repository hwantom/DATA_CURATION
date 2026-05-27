/* ============================================================
   WorkBoard Pro – Chat Module
   실시간 SNS 채팅 (1:1 + 단체 + 업무 스레드)
   ============================================================ */

const Chat = (() => {
  let currentChatId = null;
  let chatList = [];
  let messages = [];
  let unsubChats = null;
  let unsubMessages = null;
  let chatListeners = [];
  let msgListeners = [];

  /* ── 데모 데이터 ── */
  function demoChats() {
    return [
      {
        id: 'chat-general',
        type: 'group',
        name: '# 일반',
        participants: ['demo-user-001'],
        lastMessage: '안녕하세요! WorkBoard에 오신 것을 환영합니다 🎉',
        lastTimestamp: Date.now() - 3600000,
        unread: 1
      },
      {
        id: 'chat-tasks',
        type: 'thread',
        name: '# 업무-토론',
        participants: ['demo-user-001'],
        lastMessage: '기획안 초안 마감이 이틀 남았습니다.',
        lastTimestamp: Date.now() - 7200000,
        unread: 0
      },
      {
        id: 'chat-random',
        type: 'group',
        name: '# 자유게시판',
        participants: ['demo-user-001'],
        lastMessage: '오늘 점심 뭐 드실 건가요? 🍜',
        lastTimestamp: Date.now() - 10800000,
        unread: 2
      }
    ];
  }

  function demoMessages(chatId) {
    const now = Date.now();
    if (chatId === 'chat-general') {
      return [
        { id: 'm1', text: '안녕하세요! WorkBoard에 오신 것을 환영합니다 🎉', senderId: 'system', senderName: 'WorkBoard', timestamp: now - 86400000, reactions: {} },
        { id: 'm2', text: '모든 팀원이 여기서 소통할 수 있습니다.', senderId: 'system', senderName: 'WorkBoard', timestamp: now - 86300000, reactions: {} },
        { id: 'm3', text: '네, 감사합니다! 오늘부터 열심히 하겠습니다 💪', senderId: 'demo-user-001', senderName: '민승환', timestamp: now - 3600000, reactions: { '👍': ['system'] } },
      ];
    }
    if (chatId === 'chat-tasks') {
      return [
        { id: 'm4', text: '기획안 초안 마감이 이틀 남았습니다.', senderId: 'system', senderName: 'WorkBoard', timestamp: now - 7200000, reactions: {} },
        { id: 'm5', text: '현재 진행률 60% 입니다. 내일까지 마무리하겠습니다.', senderId: 'demo-user-001', senderName: '민승환', timestamp: now - 3600000, reactions: {} },
      ];
    }
    return [
      { id: 'm6', text: '오늘 점심 뭐 드실 건가요? 🍜', senderId: 'system', senderName: 'WorkBoard', timestamp: now - 10800000, reactions: {} },
      { id: 'm7', text: '김치찌개 어떨까요? 😋', senderId: 'demo-user-001', senderName: '민승환', timestamp: now - 10700000, reactions: { '😋': ['system'] } },
    ];
  }

  /* ── 초기화 ── */
  function init() {
    if (isDemoMode()) {
      chatList = demoChats();
      notifyChatListeners();
      return;
    }
    listenToChatList();
  }

  /* ── 채팅 리스트 실시간 리스너 ── */
  function listenToChatList() {
    const user = Auth.getUser();
    if (!user) return;

    if (unsubChats) unsubChats();

    unsubChats = FS.chats()
      .where('participants', 'array-contains', user.uid)
      .orderBy('lastTimestamp', 'desc')
      .onSnapshot(snap => {
        chatList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        notifyChatListeners();
      });
  }

  /* ── 채팅방 열기 (메시지 리스너) ── */
  function openChat(chatId) {
    currentChatId = chatId;

    if (isDemoMode()) {
      messages = demoMessages(chatId);
      // 읽음 처리
      const chat = chatList.find(c => c.id === chatId);
      if (chat) chat.unread = 0;
      notifyMsgListeners();
      notifyChatListeners();
      return;
    }

    if (unsubMessages) unsubMessages();

    unsubMessages = FS.messages(chatId)
      .orderBy('timestamp', 'asc')
      .onSnapshot(snap => {
        messages = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        notifyMsgListeners();
      });
  }

  /* ── 메시지 전송 ── */
  async function sendMessage(text) {
    if (!currentChatId || !text.trim()) return;
    const user = Auth.getUser();
    if (!user) return;

    const msg = {
      text: text.trim(),
      senderId: user.uid,
      senderName: user.displayName,
      senderPhoto: user.photoURL || null,
      timestamp: isDemoMode() ? Date.now() : FS.timestamp(),
      reactions: {}
    };

    if (isDemoMode()) {
      msg.id = 'msg-' + Date.now();
      messages.push(msg);
      // 채팅 리스트 업데이트
      const chat = chatList.find(c => c.id === currentChatId);
      if (chat) {
        chat.lastMessage = text.trim();
        chat.lastTimestamp = Date.now();
      }
      notifyMsgListeners();
      notifyChatListeners();
      return;
    }

    try {
      await FS.messages(currentChatId).add(msg);
      await FS.chats().doc(currentChatId).update({
        lastMessage: text.trim(),
        lastTimestamp: FS.timestamp()
      });
    } catch (err) {
      console.error('메시지 전송 실패:', err);
    }
  }

  /* ── 채팅방 생성 ── */
  async function createChat(type, name, participants) {
    const user = Auth.getUser();
    if (!user) return null;

    if (!participants.includes(user.uid)) {
      participants.push(user.uid);
    }

    const chatData = {
      type,
      name,
      participants,
      lastMessage: '',
      lastTimestamp: isDemoMode() ? Date.now() : FS.timestamp(),
      createdBy: user.uid,
      unread: 0
    };

    if (isDemoMode()) {
      chatData.id = 'chat-' + Date.now();
      chatList.unshift(chatData);
      notifyChatListeners();
      return chatData;
    }

    try {
      const ref = await FS.chats().add(chatData);
      return { id: ref.id, ...chatData };
    } catch (err) {
      console.error('채팅방 생성 실패:', err);
      return null;
    }
  }

  /* ── 이모지 반응 ── */
  async function toggleReaction(msgId, emoji) {
    const user = Auth.getUser();
    if (!user || !currentChatId) return;

    if (isDemoMode()) {
      const msg = messages.find(m => m.id === msgId);
      if (!msg) return;
      if (!msg.reactions) msg.reactions = {};
      if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
      const idx = msg.reactions[emoji].indexOf(user.uid);
      if (idx === -1) msg.reactions[emoji].push(user.uid);
      else msg.reactions[emoji].splice(idx, 1);
      if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
      notifyMsgListeners();
      return;
    }

    try {
      const ref = FS.messages(currentChatId).doc(msgId);
      const doc = await ref.get();
      if (!doc.exists) return;
      const data = doc.data();
      const reactions = data.reactions || {};
      if (!reactions[emoji]) reactions[emoji] = [];
      const idx = reactions[emoji].indexOf(user.uid);
      if (idx === -1) reactions[emoji].push(user.uid);
      else reactions[emoji].splice(idx, 1);
      if (reactions[emoji].length === 0) delete reactions[emoji];
      await ref.update({ reactions });
    } catch (err) {
      console.error('반응 토글 실패:', err);
    }
  }

  /* ── 알림 뱃지 (총 미읽음) ── */
  function getTotalUnread() {
    return chatList.reduce((sum, c) => sum + (c.unread || 0), 0);
  }

  /* ── 이벤트 ── */
  function onChatListChange(cb) { chatListeners.push(cb); }
  function onMessagesChange(cb) { msgListeners.push(cb); }
  function notifyChatListeners() { chatListeners.forEach(cb => cb(chatList)); }
  function notifyMsgListeners() { msgListeners.forEach(cb => cb(messages)); }

  /* ── 정리 ── */
  function destroy() {
    if (unsubChats) { unsubChats(); unsubChats = null; }
    if (unsubMessages) { unsubMessages(); unsubMessages = null; }
    chatList = [];
    messages = [];
    chatListeners = [];
    msgListeners = [];
  }

  return {
    init, destroy,
    openChat, sendMessage, createChat, toggleReaction,
    getChatList: () => chatList,
    getMessages: () => messages,
    getCurrentChatId: () => currentChatId,
    getTotalUnread,
    onChatListChange,
    onMessagesChange
  };
})();
