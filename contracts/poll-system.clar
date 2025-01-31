;; Constants
(define-constant err-not-owner (err u100))
(define-constant err-poll-ended (err u101))
(define-constant err-poll-not-ended (err u102))
(define-constant err-already-voted (err u103))
(define-constant err-invalid-option (err u104))

;; Data Variables
(define-data-var contract-owner principal tx-sender)
(define-data-var poll-count uint u0)

;; Data Maps
(define-map polls
    uint 
    {
        question: (string-utf8 256),
        options: (list 10 (string-utf8 64)),
        votes: (list 10 uint),
        end-block: uint,
        is-active: bool
    }
)

(define-map voter-registry
    { poll-id: uint, voter: principal }
    bool
)

;; Public Functions
(define-public (create-poll (question (string-utf8 256)) (options (list 10 (string-utf8 64))) (duration uint))
    (let
        (
            (poll-id (var-get poll-count))
            (end-block (+ block-height duration))
        )
        (if (is-eq tx-sender (var-get contract-owner))
            (begin
                (map-set polls poll-id {
                    question: question,
                    options: options,
                    votes: (list u0 u0 u0 u0 u0 u0 u0 u0 u0 u0),
                    end-block: end-block,
                    is-active: true
                })
                (var-set poll-count (+ poll-id u1))
                (ok poll-id)
            )
            err-not-owner
        )
    )
)

(define-public (cast-vote (poll-id uint) (option uint))
    (let
        (
            (poll (unwrap! (map-get? polls poll-id) err-invalid-option))
            (vote-key { poll-id: poll-id, voter: tx-sender })
        )
        (asserts! (>= (len (get options poll)) option) err-invalid-option)
        (asserts! (get is-active poll) err-poll-ended)
        (asserts! (< block-height (get end-block poll)) err-poll-ended)
        (asserts! (not (default-to false (map-get? voter-registry vote-key))) err-already-voted)
        
        (map-set voter-registry vote-key true)
        (ok (update-vote poll-id option))
    )
)

(define-public (end-poll (poll-id uint))
    (let
        (
            (poll (unwrap! (map-get? polls poll-id) err-invalid-option))
        )
        (asserts! (is-eq tx-sender (var-get contract-owner)) err-not-owner)
        (asserts! (>= block-height (get end-block poll)) err-poll-not-ended)
        (ok (map-set polls poll-id (merge poll { is-active: false })))
    )
)

;; Private Functions
(define-private (update-vote (poll-id uint) (option uint))
    (let
        (
            (poll (unwrap-panic (map-get? polls poll-id)))
            (current-votes (get votes poll))
            (updated-votes (replace-at-index current-votes option (+ (unwrap-panic (element-at current-votes option)) u1)))
        )
        (map-set polls poll-id (merge poll { votes: updated-votes }))
        true
    )
)

(define-private (replace-at-index (l (list 10 uint)) (index uint) (value uint))
    (let
        (
            (pre (take index l))
            (post (drop (+ index u1) l))
        )
        (append pre (append (list value) post))
    )
)

;; Read Only Functions
(define-read-only (get-poll (poll-id uint))
    (map-get? polls poll-id)
)

(define-read-only (get-vote-count (poll-id uint) (option uint))
    (let
        (
            (poll (unwrap! (map-get? polls poll-id) err-invalid-option))
        )
        (element-at (get votes poll) option)
    )
)

(define-read-only (has-voted (poll-id uint) (voter principal))
    (default-to false (map-get? voter-registry { poll-id: poll-id, voter: voter }))
)
