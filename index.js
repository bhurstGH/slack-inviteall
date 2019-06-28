#!/usr/bin/env node
require("dotenv").config();
const axios = require("axios");

const accessToken = process.env.SLACK_ACCESS_TOKEN;

async function getConversationId(conversation) {

  if (conversation.startsWith('#')) {
    conversation = conversation.slice(1)
  }
  const { data: { channels } } = await axios.get(`https://slack.com/api/conversations.list?token=${accessToken}&pretty=1`)

  const conversationId = channels.find(chan => chan.name === conversation).id

  return conversationId
}

async function getConversationMembers(conversationId) {

  async function queryForMembers(membersCollection = [], nextCursor = '') {
    let allConversationMembers = [];

    if (membersCollection.length > 0 && !nextCursor) {
      return membersCollection;
    }
    try {

      const response = await axios.get(
        `https://slack.com/api/conversations.members?token=${accessToken}&channel=${conversationId}${nextCursor}`
      );

      let {
        data: {
          members,
          response_metadata: { next_cursor }
        }
      } = response;

      if (next_cursor) {
        next_cursor = `&cursor=${next_cursor.replace('=', '%3D')}`
      }

      allConversationMembers = [...members, ...membersCollection]

      return await queryForMembers(allConversationMembers, next_cursor)
    }
    catch (err) {
      console.log(err);
    }

  }

  return await queryForMembers()
}

// getConversationMembers('CKMLYAPDY')
// getConversationId('dev-chatter')

async function inviteMembers(sourceChannel, targetChannel) {

  const sourceId = await getConversationId(sourceChannel)
  const targetId = await getConversationId(targetChannel)

  const sourceMembers = await getConversationMembers(sourceId)

  console.log(`&users=${sourceMembers.join('%2C')}`)

  const result = await axios.post(`https://slack.com/api/conversations.invite?token=${accessToken}&channel=${targetId}&users=${sourceMembers.join('%2C')}`)

  console.log(result)
}

inviteMembers('invitetest', 'dev-chatter')