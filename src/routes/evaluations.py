from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from src.models.user import Evaluation, Area, User, Cycle, AreaAssignment, db
from datetime import datetime
from sqlalchemy import and_

evaluations_bp = Blueprint('evaluations', __name__)

@evaluations_bp.route('/', methods=['GET'])
@login_required
def get_evaluations():
    """Busca avaliações baseado no tipo de usuário"""
    try:
        if current_user.is_admin():
            # Admin vê todas as avaliações
            evaluations = Evaluation.query.order_by(Evaluation.created_at.desc()).all()
        else:
            # Auditor vê apenas suas avaliações
            evaluations = Evaluation.query.filter_by(auditor_id=current_user.id).order_by(Evaluation.created_at.desc()).all()
        
        result = []
        for evaluation in evaluations:
            area = Area.query.get(evaluation.area_id)
            auditor = User.query.get(evaluation.auditor_id)
            cycle = Cycle.query.get(evaluation.cycle_id)
            
            eval_dict = evaluation.to_dict()
            eval_dict['area_name'] = area.name if area else 'Área não encontrada'
            eval_dict['auditor_name'] = auditor.username if auditor else 'Auditor não encontrado'
            eval_dict['cycle_name'] = cycle.name if cycle else 'Ciclo não encontrado'
            
            result.append(eval_dict)
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@evaluations_bp.route('/', methods=['POST'])
@login_required
def create_evaluation():
    """Cria uma nova avaliação"""
    try:
        data = request.get_json()
        area_id = data.get('area_id')
        
        # Validar dados obrigatórios
        required_fields = [
            'area_id', 'senso1_score', 'senso1_justification',
            'senso2_score', 'senso2_justification', 'senso3_score', 'senso3_justification',
            'senso4_score', 'senso4_justification', 'senso5_score', 'senso5_justification'
        ]
        
        for field in required_fields:
            if field not in data or data[field] is None:
                return jsonify({'error': f'Campo {field} é obrigatório'}), 400
        
        # Validar scores (1-5)
        score_fields = ['senso1_score', 'senso2_score', 'senso3_score', 'senso4_score', 'senso5_score']
        for field in score_fields:
            score = data.get(field)
            if not isinstance(score, int) or score < 1 or score > 5:
                return jsonify({'error': f'{field} deve ser um número entre 1 e 5'}), 400
        
        # Verificar se a área existe
        area = Area.query.get(area_id)
        if not area or not area.is_active:
            return jsonify({'error': 'Área não encontrada'}), 404
        
        # Verificar se existe um ciclo ativo
        active_cycle = Cycle.query.filter_by(is_active=True).first()
        if not active_cycle:
            return jsonify({'error': 'Não há ciclo ativo para realizar avaliações'}), 400
        
        # Verificar se o auditor tem permissão para avaliar esta área no ciclo atual
        assignment = AreaAssignment.query.filter_by(
            area_id=area_id,
            auditor_id=current_user.id,
            cycle_id=active_cycle.id
        ).first()
        
        if not assignment:
            return jsonify({'error': 'Você não tem permissão para avaliar esta área no ciclo atual'}), 403
        
        # Verificar se já existe avaliação para esta área/auditor/ciclo
        existing_evaluation = Evaluation.query.filter_by(
            area_id=area_id,
            auditor_id=current_user.id,
            cycle_id=active_cycle.id
        ).first()
        
        if existing_evaluation:
            return jsonify({'error': 'Você já avaliou esta área no ciclo atual'}), 400
        
        # Criar nova avaliação
        evaluation = Evaluation(
            area_id=area_id,
            auditor_id=current_user.id,
            cycle_id=active_cycle.id,
            senso1_score=data['senso1_score'],
            senso1_justification=data['senso1_justification'],
            senso2_score=data['senso2_score'],
            senso2_justification=data['senso2_justification'],
            senso3_score=data['senso3_score'],
            senso3_justification=data['senso3_justification'],
            senso4_score=data['senso4_score'],
            senso4_justification=data['senso4_justification'],
            senso5_score=data['senso5_score'],
            senso5_justification=data['senso5_justification']
        )
        
        # Calcular score total
        evaluation.calculate_total_score()
        
        db.session.add(evaluation)
        db.session.commit()
        
        return jsonify({
            'message': 'Avaliação criada com sucesso',
            'evaluation': evaluation.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@evaluations_bp.route('/<int:evaluation_id>', methods=['GET'])
@login_required
def get_evaluation(evaluation_id):
    """Busca uma avaliação específica"""
    try:
        evaluation = Evaluation.query.get_or_404(evaluation_id)
        
        # Verificar permissões
        if current_user.is_auditor() and evaluation.auditor_id != current_user.id:
            return jsonify({'error': 'Você não tem permissão para ver esta avaliação'}), 403
        
        # Buscar informações relacionadas
        area = Area.query.get(evaluation.area_id)
        auditor = User.query.get(evaluation.auditor_id)
        cycle = Cycle.query.get(evaluation.cycle_id)
        
        eval_dict = evaluation.to_dict()
        eval_dict['area_name'] = area.name if area else 'Área não encontrada'
        eval_dict['area_description'] = area.description if area else ''
        eval_dict['auditor_name'] = auditor.username if auditor else 'Auditor não encontrado'
        eval_dict['cycle_name'] = cycle.name if cycle else 'Ciclo não encontrado'
        
        return jsonify(eval_dict), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@evaluations_bp.route('/area/<int:area_id>/history', methods=['GET'])
@login_required
def get_area_evaluation_history(area_id):
    """Busca o histórico de avaliações de uma área"""
    try:
        # Verificar se a área existe
        area = Area.query.get(area_id)
        if not area or not area.is_active:
            return jsonify({'error': 'Área não encontrada'}), 404
        
        # Buscar avaliações da área ordenadas por data (mais recente primeiro)
        evaluations = db.session.query(Evaluation, Cycle, User).join(
            Cycle, Evaluation.cycle_id == Cycle.id
        ).join(
            User, Evaluation.auditor_id == User.id
        ).filter(
            Evaluation.area_id == area_id
        ).order_by(Evaluation.created_at.desc()).all()
        
        history = []
        for evaluation, cycle, auditor in evaluations:
            eval_dict = evaluation.to_dict()
            eval_dict['cycle_name'] = cycle.name
            eval_dict['auditor_name'] = auditor.username
            history.append(eval_dict)
        
        return jsonify({
            'area': area.to_dict(),
            'history': history,
            'total_evaluations': len(history)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@evaluations_bp.route('/area/<int:area_id>/previous', methods=['GET'])
@login_required
def get_previous_evaluation(area_id):
    """Busca a avaliação anterior de uma área (do mês anterior)"""
    try:
        # Verificar se a área existe
        area = Area.query.get(area_id)
        if not area or not area.is_active:
            return jsonify({'error': 'Área não encontrada'}), 404
        
        # Buscar ciclo ativo atual
        current_cycle = Cycle.query.filter_by(is_active=True).first()
        if not current_cycle:
            return jsonify({'error': 'Não há ciclo ativo'}), 400
        
        # Buscar o ciclo anterior (último ciclo completo)
        previous_cycle = Cycle.query.filter(
            and_(Cycle.is_completed == True, Cycle.id != current_cycle.id)
        ).order_by(Cycle.end_date.desc()).first()
        
        if not previous_cycle:
            return jsonify({
                'message': 'Não há avaliação anterior para esta área',
                'previous_evaluation': None
            }), 200
        
        # Buscar avaliação da área no ciclo anterior
        previous_evaluation = db.session.query(Evaluation, User).join(
            User, Evaluation.auditor_id == User.id
        ).filter(
            and_(
                Evaluation.area_id == area_id,
                Evaluation.cycle_id == previous_cycle.id
            )
        ).first()
        
        if not previous_evaluation:
            return jsonify({
                'message': 'Não há avaliação anterior para esta área',
                'previous_evaluation': None,
                'previous_cycle': previous_cycle.to_dict()
            }), 200
        
        evaluation, auditor = previous_evaluation
        eval_dict = evaluation.to_dict()
        eval_dict['auditor_name'] = auditor.username
        eval_dict['cycle_name'] = previous_cycle.name
        
        return jsonify({
            'area': area.to_dict(),
            'previous_evaluation': eval_dict,
            'previous_cycle': previous_cycle.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@evaluations_bp.route('/my-assignments', methods=['GET'])
@login_required
def get_my_assignments():
    """Busca as áreas atribuídas ao auditor logado no ciclo atual"""
    try:
        if not current_user.is_auditor():
            return jsonify({'error': 'Apenas auditores podem acessar suas atribuições'}), 403
        
        # Buscar ciclo ativo
        active_cycle = Cycle.query.filter_by(is_active=True).first()
        if not active_cycle:
            return jsonify({
                'message': 'Não há ciclo ativo',
                'assignments': []
            }), 200
        
        # Buscar atribuições do auditor no ciclo atual
        assignments = db.session.query(AreaAssignment, Area).join(
            Area, AreaAssignment.area_id == Area.id
        ).filter(
            and_(
                AreaAssignment.auditor_id == current_user.id,
                AreaAssignment.cycle_id == active_cycle.id,
                Area.is_active == True
            )
        ).all()
        
        result = []
        for assignment, area in assignments:
            # Verificar se já foi avaliada
            evaluation = Evaluation.query.filter_by(
                area_id=area.id,
                auditor_id=current_user.id,
                cycle_id=active_cycle.id
            ).first()
            
            assignment_dict = {
                'assignment_id': assignment.id,
                'area': area.to_dict(),
                'is_evaluated': evaluation is not None,
                'evaluation_id': evaluation.id if evaluation else None,
                'evaluation_score': evaluation.total_score if evaluation else None,
                'evaluation_date': evaluation.created_at.isoformat() if evaluation else None
            }
            
            result.append(assignment_dict)
        
        return jsonify({
            'cycle': active_cycle.to_dict(),
            'assignments': result,
            'total_assignments': len(result),
            'completed_evaluations': len([a for a in result if a['is_evaluated']])
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@evaluations_bp.route('/<int:evaluation_id>/details', methods=['GET'])
@login_required
def get_evaluation_details(evaluation_id):
    """Busca detalhes de uma avaliação específica com controle de acesso"""
    try:
        evaluation = Evaluation.query.get_or_404(evaluation_id)
        
        # Controle de acesso: apenas o auditor que fez a avaliação ou administradores podem ver
        if not current_user.is_admin() and evaluation.auditor_id != current_user.id:
            return jsonify({'error': 'Acesso negado. Você só pode ver detalhes das suas próprias avaliações.'}), 403
        
        # Buscar informações relacionadas
        area = Area.query.get(evaluation.area_id)
        auditor = User.query.get(evaluation.auditor_id)
        cycle = Cycle.query.get(evaluation.cycle_id)
        
        # Montar resposta com todos os detalhes
        result = {
            'id': evaluation.id,
            'area_id': evaluation.area_id,
            'area_name': area.name if area else 'Área não encontrada',
            'area_description': area.description if area else None,
            'auditor_id': evaluation.auditor_id,
            'auditor_name': auditor.username if auditor else 'Auditor não encontrado',
            'cycle_id': evaluation.cycle_id,
            'cycle_name': cycle.name if cycle else 'Ciclo não encontrado',
            'evaluation_date': evaluation.created_at.isoformat(),
            'total_score': evaluation.total_score,
            'senso1_score': evaluation.senso1_score,
            'senso1_justification': evaluation.senso1_justification,
            'senso2_score': evaluation.senso2_score,
            'senso2_justification': evaluation.senso2_justification,
            'senso3_score': evaluation.senso3_score,
            'senso3_justification': evaluation.senso3_justification,
            'senso4_score': evaluation.senso4_score,
            'senso4_justification': evaluation.senso4_justification,
            'senso5_score': evaluation.senso5_score,
            'senso5_justification': evaluation.senso5_justification,
            'created_at': evaluation.created_at.isoformat()
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

