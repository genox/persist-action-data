const { join } = require('path')
const { readFileSync, mkdirSync, writeFileSync } = require('fs')
const core = require('@actions/core')
const rimraf = require('rimraf')
const { DefaultArtifactClient } = require('@actions/artifact')

const WORKDIR = join(process.cwd(), '_persist_action_dir')

async function storeData(variable, data) {
  const client = new DefaultArtifactClient()
  const file = join(WORKDIR, `${variable}.txt`)

  // cleanup old directories if needed
  rimraf.sync(WORKDIR)
  mkdirSync(WORKDIR)

  writeFileSync(file, data, { encoding: 'utf8' })
  await client.uploadArtifact(variable, [file], process.cwd())
}

async function loadData(variables) {
  const client = new DefaultArtifactClient()

  // cleanup old directories if needed
  rimraf.sync(WORKDIR)
  mkdirSync(WORKDIR)

  for (const v of variables) {
    let data

    try {
      const file = join(WORKDIR, `${v}.txt`)
      await client.downloadArtifact(v)
      data = readFileSync(file, { encoding: 'utf8' }).toString()
    } catch (error) {
      core.warning(`Variable ${v} not found`)
    }
    core.setOutput(v, data)
    core.exportVariable(v, data)
    // store the same data with a fixed prefix so it can be iterated over if needed
    core.exportVariable(`persist-action-data-${v}`, data)
  }
}

async function runAction() {
  const inputs = {
    data: core.getInput('data'),
    variable: core.getInput('variable'),
    retrieve: core.getInput('retrieve_variables'),
  }

  if (inputs.retrieve) {
    const vars = inputs.retrieve.split(',').map((v) => v.trim())
    await loadData(vars)
    return
  }

  await storeData(inputs.variable, inputs.data)
}

runAction()
  .then(() => {
    core.info('Action completed successfully')
  })
  .catch((e) => {
    core.setFailed(e.toString())
  })
