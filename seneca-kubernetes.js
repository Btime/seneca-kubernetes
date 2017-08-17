

const request = require('request')
const find_ip = require('get-ip-address')
const get_credentials = require('kubernetes-pod-auth')


function get_pods (opts, done) {
  get_credentials(function (err, ca, token) {

    if (err) {
      return done(err)
    }

    const options = {
      url: `https://${opts.k8s_url}/api/v1/namespaces/{opts.namespace}/pods`,
      ca: ca,
      headers: {
        "Authorization": "Bearer " + token
      }
    }

    request.get(options, function (err, res, body) {

      if (err) {
        return done(err)
      }

      body = JSON.parse(body)

      const pods = body.items.map(function (item) {
        return {
          status: item.status.phase,
          ip: item.status.podIP,
          labels: item.metadata.labels
        }
      })

      done(null, pods)
    })
  })
}


function kubernetes_plugin (options) {
  const seneca = this

  const opts = Object.assign({}, options, {
    k8s_url: 'kubernetes',
    namespace: 'default'
  })

  this.add('init:kubernetes', function (args, done) {

    get_pods(options, function got_pods (err, pods) {
      if (err) {
        return done(err)
      }

      seneca.options().plugin.kubernetes = {
        myip: find_ip(),
        pods: pods
      }

      done()
    })

  })

  return 'kubernetes'
}

module.exports = kubernetes_plugin