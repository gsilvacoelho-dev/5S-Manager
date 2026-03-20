from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from src.models.user import Cycle, AreaAssignment, Evaluation, Area, User, RankingHistory, db
from datetime import datetime, date
import calendar
from functools import wraps

cycles_bp = Blueprint('cycles', __name__)

def admin_required(f):
    """Decorator para verificar se o usuário é admin"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin():
            return jsonify({'error': 'Acesso negado. Apenas administradores podem acessar esta funcionalidade.'}), 403
        return f(*args, **kwargs)
    return decorated_function


@cycles_bp.route('/', methods=['GET'])
@login_required
def get_cycles():
    try:
        cycles = Cycle.query.order_by(Cycle.created_at.desc()).all()
        return jsonify([cycle.to_dict() for cycle in cycles]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@cycles_bp.route('/active', methods=['GET'])
@login_required
def get_active_cycle():
    try:
        active_cycle = Cycle.query.filter_by(is_active=True).first()
        if active_cycle:
            return jsonify(active_cycle.to_dict()), 200
        else:
            return jsonify({'message': 'Nenhum ciclo ativo encontrado'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@cycles_bp.route('/', methods=['POST'])
@login_required
@admin_required
def create_cycle():
  
    try:
        data = request.get_json()
        name = data.get('name')
        start_date_str = data.get('start_date')
        end_date_str = data.get('end_date')

        if not all([name, start_date_str, end_date_str]):
            return jsonify({'error': 'Nome, data de início e data de fim são obrigatórios'}), 400

        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()

        if start_date >= end_date:
            return jsonify({'error': 'Data de início deve ser anterior à data de fim'}), 400
        
        if Cycle.query.filter_by(is_active=True).first():
            return jsonify({'error': 'Já existe um ciclo ativo. Finalize-o antes de criar um novo.'}), 400
        
        if Cycle.query.filter_by(name=name).first():
            return jsonify({'error': 'Já existe um ciclo com este nome'}), 400
        
        cycle = Cycle(name=name, start_date=start_date, end_date=end_date, is_active=True)
        db.session.add(cycle)
        db.session.commit()
        
        return jsonify({'message': 'Ciclo criado com sucesso', 'cycle': cycle.to_dict()}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@cycles_bp.route('/create-monthly', methods=['POST'])
@login_required
@admin_required
def create_monthly_cycle():
    
    try:
        data = request.get_json()
        year = data.get('year', datetime.now().year)
        month = data.get('month', datetime.now().month)
        
        if not (1 <= month <= 12):
            return jsonify({'error': 'Mês deve estar entre 1 e 12'}), 400

        if Cycle.query.filter_by(is_active=True).first():
            return jsonify({'error': 'Já existe um ciclo ativo. Finalize-o antes de criar um novo.'}), 400

        month_names = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
        cycle_name = f"{month_names[month-1]} {year}"

        if Cycle.query.filter_by(name=cycle_name).first():
            return jsonify({'error': f'Já existe um ciclo para {cycle_name}'}), 400
        
        start_date = date(year, month, 1)
        _, last_day = calendar.monthrange(year, month)
        end_date = date(year, month, last_day)
        
        cycle = Cycle(name=cycle_name, start_date=start_date, end_date=end_date, is_active=True)
        db.session.add(cycle)
        db.session.commit()
        
        return jsonify({'message': f'Ciclo mensal para {cycle_name} criado com sucesso', 'cycle': cycle.to_dict()}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@cycles_bp.route('/<int:cycle_id>/complete', methods=['POST'])
@login_required
@admin_required
def complete_cycle(cycle_id):
    
    try:
        cycle = Cycle.query.get_or_404(cycle_id)
        
        if not cycle.is_active or cycle.is_completed:
            return jsonify({'error': 'Este ciclo não pode ser finalizado (não está ativo ou já foi concluído).'}), 400
        
        evaluations = db.session.query(Evaluation, Area, User).join(
            Area, Evaluation.area_id == Area.id
        ).join(
            User, Evaluation.auditor_id == User.id
        ).filter(
            Evaluation.cycle_id == cycle_id
        ).order_by(Evaluation.total_score.desc()).all()

        # Permitir finalizar ciclo mesmo sem avaliações
        # Se houver avaliações, salvar no histórico de ranking
        if evaluations:
            position = 1
            for evaluation, area, auditor in evaluations:
                ranking_entry = RankingHistory(
                    cycle_id=cycle_id,
                    area_id=area.id,
                    area_name=area.name,
                    position=position,
                    total_score=evaluation.total_score,
                    auditor_name=auditor.username,
                    evaluation_id=evaluation.id,
                    senso1_score=evaluation.senso1_score,
                    senso2_score=evaluation.senso2_score,
                    senso3_score=evaluation.senso3_score,
                    senso4_score=evaluation.senso4_score,
                    senso5_score=evaluation.senso5_score
                )
                db.session.add(ranking_entry)
                position += 1
        
        cycle.is_active = False
        cycle.is_completed = True
        
        db.session.commit()
        
        return jsonify({'message': 'Ciclo finalizado com sucesso e ranking histórico salvo!', 'cycle': cycle.to_dict()}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Ocorreu um erro interno: {str(e)}'}), 500

@cycles_bp.route('/<int:cycle_id>/ranking', methods=['GET'])
@login_required
def get_cycle_ranking(cycle_id):
   
    try:
        cycle = Cycle.query.get_or_404(cycle_id)

        if cycle.is_completed:
            ranking_history = RankingHistory.query.filter_by(cycle_id=cycle_id).order_by(RankingHistory.position).all()
            
            if not ranking_history:
                return jsonify({
                    'message': 'Este ciclo foi concluído, mas não há um histórico de ranking salvo.',
                    'ranking': [],
                    'cycle': cycle.to_dict()
                }), 200

            ranking_data = [item.to_dict() for item in ranking_history]
            return jsonify({
                'cycle': cycle.to_dict(),
                'ranking': ranking_data,
                'is_historical': True
            }), 200

        else:
            evaluations = db.session.query(Evaluation, Area).join(
                Area, Evaluation.area_id == Area.id
            ).filter(
                Evaluation.cycle_id == cycle_id
            ).order_by(Evaluation.total_score.desc()).all()

            ranking_data = []
            position = 1
            for evaluation, area in evaluations:
                auditor = User.query.get(evaluation.auditor_id)
                ranking_data.append({
                    'position': position,
                    'area_name': area.name,
                    'total_score': evaluation.total_score,
                    'auditor_name': auditor.username if auditor else 'N/A',
                    'evaluation_id': evaluation.id,
                    'senso_scores': { 'seiri': evaluation.senso1_score, 'seiton': evaluation.senso2_score, 'seiso': evaluation.senso3_score, 'seiketsu': evaluation.senso4_score, 'shitsuke': evaluation.senso5_score }
                })
                position += 1

            return jsonify({
                'cycle': cycle.to_dict(),
                'ranking': ranking_data,
                'is_historical': False
            }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Ocorreu um erro interno: {str(e)}'}), 500

# --- Rota para deletar um ciclo ---
@cycles_bp.route('/<int:cycle_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_cycle(cycle_id):
    """
    Exclui um ciclo e todos os seus dados associados.
    Não permite a exclusão de um ciclo ativo.
    """
    try:
        cycle = Cycle.query.get_or_404(cycle_id)

        # Regra de segurança: não permitir a exclusão de um ciclo ativo.
        if cycle.is_active:
            return jsonify({'error': 'Não é possível excluir um ciclo ativo. Finalize-o primeiro.'}), 400

        # Excluir dados relacionados em cascata para manter a integridade do banco
        RankingHistory.query.filter_by(cycle_id=cycle_id).delete()
        Evaluation.query.filter_by(cycle_id=cycle_id).delete()
        AreaAssignment.query.filter_by(cycle_id=cycle_id).delete()
        
        # Agora, excluir o ciclo principal
        db.session.delete(cycle)
        
        # Confirmar a transação
        db.session.commit()
        
        return jsonify({'message': f'O ciclo "{cycle.name}" e todos os seus dados foram excluídos com sucesso.'}), 200

    except Exception as e:
        # Em caso de erro, reverter a transação para não corromper os dados
        db.session.rollback()
        return jsonify({'error': f'Ocorreu um erro ao excluir o ciclo: {str(e)}'}), 500